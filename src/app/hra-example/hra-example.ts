import { Component, input } from '@angular/core';

@Component({
  selector: 'app-hra-example',
  imports: [],
  templateUrl: './hra-example.html',
  styleUrl: './hra-example.css',
})
export class HraExample {
  // E.g. `UBERON:0001229` for renal corpuscle
  uberon = input<string>("UBERON:0001229");
  
  // An array with Cell ontology CURIEs for highlighting the illustration substructures.
  cellStructures = input<string[]>(["CL:123", "CL:456"]);
}
