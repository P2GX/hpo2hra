import json
import re
from collections import defaultdict
from pathlib import PurePosixPath
# pip install owlready2
from owlready2 import get_ontology, Thing, And, Or, Not, Restriction


from dataclasses import dataclass

@dataclass
class ParseResult:
    hpo_id: str
    hpo_label: str
    other_id: str
    other_label: str
    direct: bool



def get_term_id(iri: str) -> str:
    ontology_id = PurePosixPath(iri).name.replace("_", ":")
    return ontology_id

def get_term_name(owl_class) -> str:
    if owl_class.label:
        label_name = owl_class.label[0]
    else:
        label_name = owl_class.name
    return label_name

def extract_defined_terms_and_descendants(owl_file_path, output_json_path):
    # 1. Load the ontology
    # For local files, prefix with 'file://' if necessary, or pass the path directly
    onto = get_ontology(f"file://hp.owl").load()
    
    results = dict()

    # 2. Iterate through all OWL classes
    for owl_class in onto.classes():
        # Check if the class is HPO (we also have other ontologies in hp.owl)
        if "HP_" not in owl_class.iri:
            continue
        #print(f"iri = {owl_class.iri}")
        # owlready2 populates .equivalent_to with Class constructs/restrictions
        if owl_class.equivalent_to:
            
            # Stringify the logical definition for documentation purposes
            logical_def_str = str(owl_class.equivalent_to)
            pattern = r"obo\.((?:CHEBI|UBERON|CL|CELL)_\d+)"
            matches = re.findall(pattern, logical_def_str)
            match_list = list(matches)
            if len(match_list) == 2 and any(x for x in match_list if x == "UBERON_0000178"):
                # this is a definition of a chemical (CHEBI) that is located in blood ("UBERON_0000178")
                # it does not currently make sense to show this in the HRA browser, so let's just skip it
                continue
            elif len(match_list) > 1:
                print(f"Matching more than one HPO term: {match_list}")
                continue # unexpected
            elif len(match_list) > 0:
                hpo_id = get_term_id(owl_class.iri)
                hpo_label = get_term_name(owl_class)
                other_id = match_list[0] # if we get here, we know there is exactly one entry in this list
                other_name = onto[other_id]
                other_id = other_id.replace("_", ":")
                print(f"Otehr {other_id}")
                print(hpo_id, hpo_label)
                result = ParseResult(hpo_id=hpo_id, hpo_label=hpo_label, other_id=other_id, other_label=other_name, direct=True)
                results[hpo_id] = result
                descendants = owl_class.descendants()
                descendant_iris = [
                    desc.iri for desc in descendants if desc != owl_class
                ]
                for des in descendant_iris:
                    des_name = onto[des]
                    des_id = get_term_id(des)
                    result = ParseResult(hpo_id=des_id, hpo_label=des_name, other_id=other_id, other_label=other_name, direct=False)
                    if des_id not in results:
                        results[des_id] = result 
                    elif result.direct:
                        results[des_id] = result 
                    else:
                        print(f"Skipping {result} because we already have a direct result")



                

   
        
    print(f"Extraction complete. Found {len(results)} logically defined terms.")
    print(f"Results saved to {output_json_path}")

# Example Usage
extract_defined_terms_and_descendants("path/to/your_ontology.owl", "defined_terms_descendants.json")