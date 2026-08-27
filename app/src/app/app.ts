import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Hpohra } from '@p2gx/hpohra';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { Subject, switchMap } from 'rxjs';
import { HpoTerm, HpoTerms } from './hpo-terms';

@Component({
  selector: 'app-root',
  imports: [AutoComplete, Hpohra],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private hpoTerms = inject(HpoTerms);

  title = signal('HRA / HPO Viewer Widget');
  selectedTerm = signal<HpoTerm | null>(null);

  private searchQuery$ = new Subject<string>();

  searchResults = toSignal(
    this.searchQuery$.pipe(switchMap((query) => this.hpoTerms.search(query))),
    { initialValue: [] as HpoTerm[] }
  );

  selectedHpoTermId = computed(() => this.selectedTerm()?.id ?? null);

  onSearch(event: AutoCompleteCompleteEvent) {
    this.searchQuery$.next(event.query);
  }

  onSelect(event: AutoCompleteSelectEvent) {
    this.selectedTerm.set(event.value as HpoTerm);
  }
}
