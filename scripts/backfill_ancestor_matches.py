import csv
import io
import re

CL_ID_PATTERN = re.compile(r'obo\.(CL_\d+)')
UBERON_ID_PATTERN = re.compile(r'obo\.(UBERON_\d+)')

CSV_FIELDNAMES = ['hpo_iri', 'hpo_label', 'term', 'term_label', 'do_type', 'digital_object', 'file_url']


def hpo_iri_to_id(hpo_iri):
    return hpo_iri.rsplit('/', 1)[-1].replace('_', ':')


def parse_csv_rows(csv_text):
    all_rows = []
    svg_rows_by_id = {}
    glb_rows_by_id = {}
    for row in csv.DictReader(io.StringIO(csv_text)):
        all_rows.append(row)
        file_url = row['file_url'].strip().lower()
        hpo_id = hpo_iri_to_id(row['hpo_iri'])
        if file_url.endswith('.svg'):
            svg_rows_by_id.setdefault(hpo_id, []).append(row)
        elif file_url.endswith('.glb'):
            glb_rows_by_id.setdefault(hpo_id, []).append(row)
    return all_rows, svg_rows_by_id, glb_rows_by_id


def extract_annotation_id(equivalent_to_repr):
    """A class's own CL/UBERON reference in its own equivalent_to axiom, preferring
    CL (cell) over UBERON. Multiple CL matches take the first (specific-before-generic,
    per HPO's compositional definition pattern); multiple UBERON-only matches are
    ambiguous (often two distinct structures) and yield no annotation."""
    cl_matches = list(dict.fromkeys(CL_ID_PATTERN.findall(equivalent_to_repr)))
    if cl_matches:
        return cl_matches[0]
    uberon_matches = list(dict.fromkeys(UBERON_ID_PATTERN.findall(equivalent_to_repr)))
    if len(uberon_matches) == 1:
        return uberon_matches[0]
    return None


def _ancestor_levels(hpo_id, get_parents):
    visited = {hpo_id}
    frontier = sorted(set(get_parents(hpo_id)) - visited)
    while frontier:
        yield frontier
        visited.update(frontier)
        next_frontier = set()
        for node in frontier:
            next_frontier.update(get_parents(node))
        frontier = sorted(next_frontier - visited)


def _find_nearest_ancestor_match(hpo_id, get_parents, lookup):
    for level in _ancestor_levels(hpo_id, get_parents):
        for candidate in level:
            if candidate in lookup:
                return candidate
    return None


def explain_match(hpo_id, get_parents, lookup):
    """Returns the level-by-level BFS trace used to decide hpo_id's match, for debugging."""
    own_match = hpo_id if hpo_id in lookup else None
    steps = [{'distance': 0, 'candidates': [hpo_id], 'matched': own_match}]
    if own_match:
        return steps
    for distance, level in enumerate(_ancestor_levels(hpo_id, get_parents), start=1):
        matched = next((c for c in level if c in lookup), None)
        steps.append({'distance': distance, 'candidates': level, 'matched': matched})
        if matched:
            break
    return steps


def compute_backfill_rows(candidates, get_parents, existing_rows_by_id):
    new_rows = []
    for hpo_id, hpo_iri, hpo_label, own_annotation in candidates:
        if hpo_id in existing_rows_by_id:
            continue
        match_id = _find_nearest_ancestor_match(hpo_id, get_parents, existing_rows_by_id)
        if match_id is None:
            continue
        for matched_row in existing_rows_by_id[match_id]:
            new_rows.append({
                'hpo_iri': hpo_iri,
                'hpo_label': hpo_label,
                'term': own_annotation['term'] if own_annotation else matched_row['term'],
                'term_label': own_annotation['term_label'] if own_annotation else matched_row['term_label'],
                'do_type': matched_row['do_type'],
                'digital_object': matched_row['digital_object'],
                'file_url': matched_row['file_url'],
            })
    return new_rows


# --- Ontology / CSV file I/O (requires `pip install owlready2`, untested here: no owlready2 in this env) ---

OWL_PATH = 'hp.owl'
INPUT_CSV_PATH = 'src/assets/hpo-hra-relevant-dos.csv'
OUTPUT_CSV_PATH = 'src/assets/hpo-hra-relevant-dos-backfilled.csv'
ROOT_HPO_ID = 'HP:0000118'  # Phenotypic abnormality


def get_term_label(owl_class):
    if owl_class.label:
        return owl_class.label[0]
    return owl_class.name


def get_direct_hpo_parents(owl_class):
    parents = []
    for parent in owl_class.is_a:
        if hasattr(parent, 'iri') and 'HP_' in parent.iri:
            parents.append(hpo_iri_to_id(parent.iri))
    return parents


def get_own_annotation(owl_class, iris_lookup):
    if not owl_class.equivalent_to:
        return None
    other_id = extract_annotation_id(str(owl_class.equivalent_to))
    if other_id is None:
        return None
    other_iri = f'http://purl.obolibrary.org/obo/{other_id}'
    other_class = iris_lookup[other_iri]
    if other_class is None:
        return None
    return {'term': other_iri, 'term_label': get_term_label(other_class)}


def load_candidates_and_parent_map(owl_path, root_hpo_id):
    from owlready2 import get_ontology, IRIS  # pip install owlready2

    get_ontology(f'file://{owl_path}').load()
    root_iri = f'http://purl.obolibrary.org/obo/{root_hpo_id.replace(":", "_")}'
    root = IRIS[root_iri]

    classes = set(root.descendants())
    classes.add(root)

    candidates = []
    parent_map = {}
    for owl_class in classes:
        hpo_id = hpo_iri_to_id(owl_class.iri)
        own_annotation = get_own_annotation(owl_class, IRIS)
        candidates.append((hpo_id, owl_class.iri, get_term_label(owl_class), own_annotation))
        parent_map[hpo_id] = get_direct_hpo_parents(owl_class)
    return candidates, parent_map


def _report(label, direct_by_id, backfilled, total_candidates):
    backfilled_terms = {hpo_iri_to_id(r['hpo_iri']) for r in backfilled}
    matched_terms = set(direct_by_id) | backfilled_terms
    print(f'Terms with a direct {label} entry: {len(direct_by_id)}')
    print(f'Terms backfilled with {label} from an ancestor: {len(backfilled_terms)} ({len(backfilled)} rows added)')
    print(f'Terms still unmatched ({label}): {total_candidates - len(matched_terms)}')


def main():
    with open(INPUT_CSV_PATH, 'r', encoding='utf-8') as f:
        all_rows, svg_rows_by_id, glb_rows_by_id = parse_csv_rows(f.read())

    candidates, parent_map = load_candidates_and_parent_map(OWL_PATH, ROOT_HPO_ID)
    get_parents = lambda hpo_id: parent_map.get(hpo_id, [])

    svg_backfilled = compute_backfill_rows(candidates, get_parents, svg_rows_by_id)
    glb_backfilled = compute_backfill_rows(candidates, get_parents, glb_rows_by_id)

    with open(OUTPUT_CSV_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(all_rows + svg_backfilled + glb_backfilled)

    print(f'Candidates processed: {len(candidates)}')
    _report('svg', svg_rows_by_id, svg_backfilled, len(candidates))
    _report('glb', glb_rows_by_id, glb_backfilled, len(candidates))
    print(f'Output written to {OUTPUT_CSV_PATH}')


if __name__ == '__main__':
    main()
