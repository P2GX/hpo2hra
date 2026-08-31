import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { HraRecord } from './model';

// Splits one CSV record into fields, RFC4180-style: fields may be wrapped in double
// quotes (required when they contain a comma), with `""` as an escaped quote.
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

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
        glb: {} as Record<string, HraRecord>,
        hpo: {} as Record<string, string>,
      },
    }
  );

  private svgDatabase = computed(() => this.databases().svg);
  private glbDatabase = computed(() => this.databases().glb);
  private _availableHpoLabels = computed(() => this.databases().hpo);

  readonly availableHpoMap = this._availableHpoLabels;

  private parseCsv(content: string): {
    svg: Record<string, HraRecord>;
    glb: Record<string, HraRecord>;
    hpo: Record<string, string>;
  } {
    const lines = content.split('\n');
    const svgLookup: Record<string, HraRecord> = {};
    const glbLookup: Record<string, HraRecord> = {};
    const hpoLabelToId: Record<string, string> = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [hpo_iri, hpo_label, term, term_label, do_type, digital_object, file_url] =
        parseCsvLine(line);
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
          fileUrl: file_url,
        };
        const lc_file_url = file_url.trim().toLocaleLowerCase();
        if (lc_file_url.endsWith('svg')) {
          svgLookup[id] = record;
        } else if (lc_file_url.endsWith('glb')) {
          glbLookup[id] = record;
        } else {
          throw Error(`Unrecognized file suffix: '${lc_file_url}'`);
        }
      }
    }

    return { svg: svgLookup, glb: glbLookup, hpo: hpoLabelToId };
  }

  readonly getSvgRecord = (hpoId: string) => computed(() => this.svgDatabase()[hpoId] || null);
  readonly getGlbRecord = (hpoId: string) => computed(() => this.glbDatabase()[hpoId] || null);
}
