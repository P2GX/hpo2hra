import { Component, computed, inject, input } from '@angular/core';
import { HpoMapService } from './hpo-mapper';

@Component({
  selector: 'hpohra',
  template: `
    @if (record(); as r) {
      <img [src]="r.fileUrl" [alt]="'HRA illustration for ' + hpoId()" />
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
