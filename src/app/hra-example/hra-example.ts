import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  Renderer2,
  signal,
} from '@angular/core';
import { HraKgService, V1Service } from '@hra-api/ng-client';

@Component({
  selector: 'app-hra-example',
  imports: [],
  templateUrl: './hra-example.html',
  styleUrl: './hra-example.css',
})
export class HraExample {
  // E.g. `UBERON:0001229` for renal corpuscle
  uberon = input<string>('UBERON:0001229');

  // An array with Cell ontology CURIEs for highlighting the illustration substructures.
  cellStructures = input<string[]>(['CL:123', 'CL:456']);

  purl = computed(() => {
    // TODO: Go from uberon, etc. to purl
    return `https://purl.humanatlas.io/2d-ftu/pancreas-intercalated-duct`;
  });

  elementRef = inject(ElementRef);

  renderer = inject(Renderer2);

  hovered = signal<unknown | undefined>(undefined);

  data = signal<unknown | undefined>(undefined);

  api = inject(V1Service);
  api2 = inject(HraKgService);

  constructor() {
    // TODO: Inset styles and script only once!
    const head = document.head;
    const link = this.renderer.createElement('link');
    this.renderer.setAttribute(link, 'rel', 'stylesheet');
    this.renderer.setAttribute(
      link,
      'href',
      'https://cdn.humanatlas.io/ui/medical-illustration/styles.css',
    );
    this.renderer.appendChild(head, link);

    const script = this.renderer.createElement('script');
    this.renderer.setAttribute(
      script,
      'src',
      'https://cdn.humanatlas.io/ui/medical-illustration/wc.js',
    );
    this.renderer.setAttribute(script, 'type', 'module');
    this.renderer.appendChild(head, script);

    const el = this.renderer.createElement('hra-medical-illustration');
    this.renderer.appendChild(this.elementRef.nativeElement, el);
    this.renderer.listen(el, 'cell-hover', (event: CustomEvent) => {
      console.log(event.detail);
      this.hovered.set(JSON.stringify(event.detail));
    });

    effect(() => {
      this.renderer.setAttribute(el, 'selected-illustration', this.purl());
      this.renderer.setAttribute(el, 'highlight', 'http://purl.obolibrary.org/obo/CL_1001433');
    });

    this.api
      .sparqlPost({
        sparqlQueryRequest: {
          query: `
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            SELECT * WHERE {
              ?sub ?pred ?obj .
            } LIMIT 10
          `,
        },
      })
      .subscribe((result) => {
        this.data.set(JSON.stringify(result));
      });
  }
}
