import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HpoMapService {
  constructor(private httpClient: HttpClient) {}

  /**
   * Get the UBERON/CL mappings for the HPO.
   * 
   * @param term_id HPO CURIE (e.g. `HP:0033895` for Abnormal renal arteriole endothelium morphology)
   * @returns an array with the corresponding UBERON/CL CURIEs.
   */
  mapToHra(term_id: string): Promise<string[]> {
    return Promise.reject('not yet implemented');
  }
}
