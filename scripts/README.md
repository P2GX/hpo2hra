# scripts/

One-off Python data-prep scripts for building the HPO→HRA (Human Reference Atlas)
mapping data consumed by the Angular lib/app. Not part of the build; run manually.
Dependency (not declared anywhere else in the repo): `pip install owlready2`.

## backfill_ancestor_matches.py

**Active / maintained.** Fills in HRA illustration coverage for HPO terms that have
no direct match by inheriting the nearest ancestor's match.

- Reads `hp.owl` (HPO ontology, not tracked in the repo — must be downloaded
  separately and placed at the repo root) and `src/assets/hpo-hra-relevant-dos.csv`
  (also not tracked; the only file present in `src/assets/` today is the *output*
  of a previous run, `hpo-hra-relevant-dos-backfilled.csv`).
- Walks HPO descendants of `HP:0000118` ("Phenotypic abnormality"). For each term
  with no existing SVG/GLB row, BFS's up the `is_a` parent chain and copies the
  nearest ancestor's row(s), separately for SVG and GLB rows.
- Also derives an "own annotation" (a CL/UBERON term named in the HPO class's own
  `equivalent_to` logical definition, preferring CL over UBERON, per
  `extract_annotation_id`) and uses that as the `term`/`term_label` for a backfilled
  row when available, falling back to the matched ancestor's term otherwise.
- Writes `src/assets/hpo-hra-relevant-dos-backfilled.csv` (original rows + backfilled
  rows) and prints a coverage report (direct / backfilled / unmatched counts) per
  file type.
- Run: `python scripts/backfill_ancestor_matches.py` from the repo root, with
  `hp.owl` and the input CSV present.

**Known gap:** `lib/src/lib/hpo-mapper.ts` fetches `assets/hpo-hra-relevant-dos.csv`
at runtime, but only the `-backfilled.csv` output exists in `src/assets/` — worth
confirming that's not a stale reference before relying on this pipeline's output.

## get_terms_for_hra.py

**Exploratory / not wired up, has bugs — treat as reference only.** Earlier attempt
at the same problem: for each HPO class with a logical definition naming exactly one
CHEBI/UBERON/CL/CELL term (skipping chemical-in-blood defs), records a direct match
and propagates it to descendants (an existing direct match on a descendant wins over
an inherited one).

Issues if you try to run it as-is:
- `extract_defined_terms_and_descendants` ignores its `owl_file_path` parameter and
  hardcodes the literal string `"hp.owl"`.
- It builds a `results` dict but never writes it to `output_json_path` — the closing
  "Results saved to ..." print is aspirational, not real.
- The module-level example call at the bottom runs on import with a placeholder path
  (`"path/to/your_ontology.owl"`), so `python scripts/get_terms_for_hra.py` fails
  immediately unless that line is edited first.
- Several imports (`Thing`, `And`, `Or`, `Not`, `Restriction`, `defaultdict`) are unused.
