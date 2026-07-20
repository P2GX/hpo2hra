
import { HraKgService, V1Service } from '@hra-api/ng-client';
import { viewChild, Component, ElementRef, Renderer2, inject, signal, effect, OnInit, input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
     selector: 'app-hra-widget',
     standalone: true,
  template: `<hra-medical-illustration #widget></hra-medical-illustration>`,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styles: [`:host { display: block; }`]
     }
)
export class HraWidgetComponent implements OnInit {
  // Allow the parent to override the PURL
  purl = input<string>('https://purl.humanatlas.io/2d-ftu/pancreas-intercalated-duct');
  // Reference the web component element
  widget = viewChild.required<ElementRef>('widget');

  private syncEffect = effect(() => {
    const el = this.widget().nativeElement;
    const url = this.purl(); // This creates the dependency
    if (el && url) {
      el.setAttribute('selected-illustration', url);
    }
  });
  
  private el: HTMLElement | undefined;
  private renderer = inject(Renderer2);
  private elementRef = inject(ElementRef);
  private api = inject(V1Service);

  ngOnInit() {
    this.ensureExternalResources();
  
  }

  private createWidget() {
    this.el = this.renderer.createElement('hra-medical-illustration');
    this.renderer.appendChild(this.elementRef.nativeElement, this.el);

    // Sync PURL changes
    effect(() => {
      if (this.el) {
        this.renderer.setAttribute(this.el, 'selected-illustration', this.purl());
      }
    });

    // Handle events
    this.renderer.listen(this.el!, 'cell-hover', (event: CustomEvent) => {
      console.log('Hovered:', event.detail);
    });
  }

  private ensureExternalResources() {
    // Check if scripts exist before adding to avoid duplication
    if (!document.getElementById('hra-styles')) {
      const link = this.renderer.createElement('link');
      this.renderer.setAttribute(link, 'id', 'hra-styles');
      this.renderer.setAttribute(link, 'rel', 'stylesheet');
      this.renderer.setAttribute(link, 'href', 'https://cdn.humanatlas.io/ui/medical-illustration/styles.css');
      this.renderer.appendChild(document.head, link);
    }
    if (!document.getElementById('hra-script')) {
        const script = this.renderer.createElement('script');
        this.renderer.setAttribute(script, 'id', 'hra-script'); // Set an ID
        this.renderer.setAttribute(script, 'src', 'https://cdn.humanatlas.io/ui/medical-illustration/wc.js');
        this.renderer.setAttribute(script, 'type', 'module');
        this.renderer.appendChild(document.head, script);
    }
  }
}