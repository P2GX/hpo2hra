import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { HraRecord } from '../model/model';




@Injectable({
  providedIn: 'root',
})
export class HpoMapService {
  private http = inject(HttpClient);

  // Load and parse in a single stream
  private database = toSignal(
    this.http.get('assets/hpo-hra-relevant-dos.csv', { responseType: 'text' }).pipe(
      map((csvText) => this.parseCsv(csvText))
    ),
    { initialValue: {} as Record<string, HraRecord> }
  );

  private parseCsv(content: string): Record<string, HraRecord> {
    const lines = content.split('\n');
    const lookup: Record<string, HraRecord> = {};
    const svgLookup: Record<string, HraRecord> = {};

    // Start at 1 to skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [hpo_iri, hpo_label, term, term_label, do_type, digital_object, file_url] = line.split(',');

      const id = hpo_iri.split('/').pop()?.replace('_', ':') || '';

      if (id) {
        if (file_url.endsWith("svg")) {
            lookup[id] = {
          hpoIri: hpo_iri,
          hpoLabel: hpo_label,
          term,
          termLabel: term_label,
          doType: do_type,
          digitalObject: digital_object,
          fileUrl: file_url
        }; 
      }/* else {
          lookup[id] = {
            hpoIri: hpo_iri,
            hpoLabel: hpo_label,
            term,
            termLabel: term_label,
            doType: do_type,
            digitalObject: digital_object,
            fileUrl: file_url
          }*/
        }
    }
    return lookup;
  }

  // Use a computed signal for the public API
  // This allows components to react to the database loading
  readonly getRecord = (hpoId: string) => computed(() => this.database()[hpoId] || null);

}