import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Hpohra } from '@p2gx/hpohra';
import { HpoTerms } from './hpo-terms';

@Component({
  selector: 'app-root',
  imports: [FormsModule, Hpohra],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private hpoTerms = inject(HpoTerms);

  title = signal('HRA / HPO Viewer Widget');
  selectedHpoTermLabel = signal('');

  availableHpoTermLabels = computed(() => this.hpoTerms.availableLabels());

  filteredTerms = computed(() => {
    const typed = this.selectedHpoTermLabel().trim().toLowerCase();
    if (!typed) return [];
    return this.availableHpoTermLabels()
      .filter((t) => t.toLowerCase().includes(typed))
      .slice(0, 20);
  });

  selectedHpoTermId = computed(() => this.hpoTerms.idForLabel(this.selectedHpoTermLabel()));
}
