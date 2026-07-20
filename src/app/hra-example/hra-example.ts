import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { HpoMapService } from '../service/hpo-mapper';
import { HraViewerComponent } from '../hra-viewer/hra-viewer.component';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { HraWidgetComponent } from '../hra-widget/hra-widget.component';


@Component({
  selector: 'app-hra-example',
  imports: [HraViewerComponent],
  templateUrl: './hra-example.html',
  styleUrl: './hra-example.css',
})
export class HraExample implements OnInit {
  ngOnInit(): void {}
  private overlay = inject(Overlay);
  hraViewerRef = viewChild.required<HraViewerComponent>('hraViewer');
  hraViewerOpen = signal(false);
  hpoMappingService = inject(HpoMapService);
  title = signal<string>('Emphysema');
  hpoExampleTerm = signal<string>('HP:0002097'); // emphysema


  hpo_target = input.required<string>(); // cardiomegaly

  hpo_purl = computed(() => {
    const hpo_id = this.hpo_target();
    const formattedId = hpo_id.replace(':', '_');
    return `http://purl.obolibrary.org/obo/${formattedId}`;
  });


  showSplenicCyst() {
    this.hpoExampleTerm.set('HP:0000778'); // ,Hypoplasia of the thymus
    this.hraViewerRef().open();
  }

  showHepatomegaly() {
    this.hpoExampleTerm.set('HP:0002240'); // Hepatomegaly
    this.hraViewerRef().open();
  }


  popupHypoplasiaThymus() {
    const hpoyplasiaThymusTermid = "HP:0000778";
    const hraRecordSignal = this.hpoMappingService.getRecord(hpoyplasiaThymusTermid);
    const record = typeof hraRecordSignal === 'function' ? hraRecordSignal() : hraRecordSignal;
    if (record) {
      const digitalObject = record.digitalObject;
      this.openHraViewer(digitalObject);
    }
  }

  openHraViewer(digitalObject: string) {
    // 1. Create the overlay
    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
    });

    // 2. Create a portal for the component
    const portal = new ComponentPortal(HraWidgetComponent);

    // 3. Attach component
    const componentRef = overlayRef.attach(portal);
    componentRef.setInput('purl', digitalObject);
    // 4. Handle backdrop clicks to close
    overlayRef.backdropClick().subscribe(() => overlayRef.detach());
    
    // Optional: Pass data to the component instance
    // componentRef.instance.someInput = 'data';
  }
}
