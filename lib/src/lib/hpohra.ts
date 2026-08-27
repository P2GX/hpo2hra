import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input } from '@angular/core';
import { HpoMapService } from './hpo-mapper';

@Component({
  selector: 'hpohra',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (record(); as r) {
      <hra-medical-illustration [selectedIllustration]="r.digitalObject" [highlight]="[r.term]" />
    } @else {
      <p>No HRA illustration found for {{ hpoId() }}</p>
    }
  `,
})
export class Hpohra {
  hpoId = input.required<string>();

  private hpoMapService = inject(HpoMapService);

  protected record = computed(() => this.hpoMapService.getSvgRecord(this.hpoId())());
}
