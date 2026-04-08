
/* One line from the HRA file with information that links an HPO term to HRA resources */
export interface HraRecord {
  hpo_iri: string;
  hpo_label: string;
  term: string;
  term_label: string;
  do_type: string;
  digital_object: string;
  file_url: string;
}


export type HraDatabase = Record<string, HraRecord>;