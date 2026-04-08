import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Component, computed, inject, input } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { HraRecord } from '../model/model';



@Injectable({
  providedIn: 'root',
})
export class HpoMapService {
  constructor(private httpClient: HttpClient) {}

  private http = inject(HttpClient);

  private csvRaw = toSignal(
    this.http.get('assets/hpo-relevant-dos.csv', {
      responseType: 'text' as const
    })
  );

  private database = computed(() => {
    const content = this.csvRaw();
    if (!content) return {} as Record<string, HraRecord>;

    const lines = content.split('\n');
    const lookup: Record<string, HraRecord> = {};

    // Start at index 1 to skip the header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [hpo_iri, hpo_label, term, term_label, do_type, digital_object, file_url] = line.split(',');

      // Extract the ID (e.g., HP_0001640) from the end of the IRI
      const idFromIri = hpo_iri.split('/').pop() || ''; 
      
      // Normalize the ID to match your input format (HP_ to HP:)
      const normalizedId = idFromIri.replace('_', ':');

      lookup[normalizedId] = {
        hpo_iri, hpo_label, term, term_label, do_type, digital_object, file_url
      };
    }

    return lookup;
  });

  getRecord(hpoId: string): HraRecord | null {
    return this.database()[hpoId] || null;
  }



}
