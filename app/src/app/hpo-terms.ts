import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HpoTerms {
  private http = inject(HttpClient);

  private labelToId = toSignal(
    this.http.get('assets/hpo-hra-relevant-dos.csv', { responseType: 'text' }).pipe(
      map((csvText) => this.parseLabels(csvText))
    ),
    { initialValue: {} as Record<string, string> }
  );

  readonly availableLabels = computed(() => Object.keys(this.labelToId()));

  idForLabel(label: string): string | null {
    return this.labelToId()[label] ?? null;
  }

  private parseLabels(content: string): Record<string, string> {
    const lines = content.split('\n');
    const labelToId: Record<string, string> = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const [hpo_iri, hpo_label] = line.split(',');
      if (!hpo_iri) continue;
      const id = hpo_iri.split('/').pop()?.replace('_', ':') || '';
      if (id) labelToId[hpo_label] = id;
    }
    return labelToId;
  }
}
