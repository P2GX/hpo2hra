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

  private databases = toSignal(
    this.http.get('assets/hpo-hra-relevant-dos.csv', { responseType: 'text' }).pipe(
      map((csvText) => this.parseCsv(csvText))
    ),
    { 
      initialValue: { 
        svg: {} as Record<string, HraRecord>, 
        glb: {} as Record<string, HraRecord> ,
        hpo: {} as Record<string,string>
      } 
    }
  );

  // Expose individual databases derived from the main signal
  private svgDatabase = computed(() => this.databases().svg);
  private glbDatabase = computed(() => this.databases().glb);
  private _availableHpoLabels = computed(() => this.databases().hpo);

  readonly availableHpoMap = this._availableHpoLabels;


  private parseCsv(content: string): { svg: Record<string, HraRecord>; glb: Record<string, HraRecord>; hpo: Record<string,string> } {
    const lines = content.split('\n');
    const svgLookup: Record<string, HraRecord> = {};
    const glbLookup: Record<string, HraRecord> = {};
    const hpoLabelToId: Record<string, string> = {};

    // Start at 1 to skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [hpo_iri, hpo_label, term, term_label, do_type, digital_object, file_url] = line.split(',');
      if (!hpo_iri || !file_url) continue;
      const id = hpo_iri.split('/').pop()?.replace('_', ':') || '';

      if (id) {
        hpoLabelToId[hpo_label] = id;
        const record: HraRecord = {
          hpoIri: hpo_iri,
          hpoLabel: hpo_label,
          term,
          termLabel: term_label,
          doType: do_type,
          digitalObject: digital_object,
          fileUrl: file_url
        };
        const lc_file_url = file_url.trim().toLocaleLowerCase();
        if (lc_file_url.endsWith('svg')) {
          svgLookup[id] = record;
        } else if (lc_file_url.endsWith("glb")) {
          glbLookup[id] = record;
        } else {
          throw Error(`Unrecognized file suffix: '${lc_file_url}'`)
        }
      }
    }

    return { svg: svgLookup, glb: glbLookup, hpo: hpoLabelToId };
  }

  purlToHpId(purl: string): string {
    if (!purl) return '';
    
    // Extract the last segment after the final slash or underscore
    // Handles both http://purl.obolibrary.org/obo/HP_0005415 and http://purl.obolibrary.org/obo/HP:0005415
    const match = purl.match(/HP[_-](\d+)$/i);
    if (match) {
      return `HP:${match[1]}`;
    }
    
    return purl; // fallback if it doesn't match the expected pattern
  }

  // Public API computed signals for components
  readonly getSvgRecord = (hpoId: string) => computed(() => this.svgDatabase()[hpoId] || null);
  readonly getGlbRecord = (hpoId: string) => computed(() => this.glbDatabase()[hpoId] || null);
}