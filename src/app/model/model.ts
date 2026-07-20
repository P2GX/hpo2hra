
export interface HraRecord {
  hpoIri: string;
  hpoLabel: string;
  term: string;
  termLabel: string;
  doType: string;
  digitalObject: string;
  fileUrl: string;
}

export type HraDatabase = Record<string, HraRecord>;