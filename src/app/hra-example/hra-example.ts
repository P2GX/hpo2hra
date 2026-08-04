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
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hra-example',
  imports: [HraViewerComponent, FormsModule],
  templateUrl: './hra-example.html',
  styleUrl: './hra-example.scss',
})
export class HraExample implements OnInit {
  ngOnInit(): void {}
  private overlay = inject(Overlay);
  hraViewerRef = viewChild.required<HraViewerComponent>('hraViewer');
  hraViewerOpen = signal(false);
  hpoMappingService = inject(HpoMapService);
  title = signal<string>('HRA / HPO Viewer Widget');
  hpoExampleTerm = signal<string>('HP:0002097'); // emphysema


  hpo_target = input.required<string>(); // cardiomegaly

  selectedHpoTermLabel = signal('');
  selectedHpoTermId = computed(() => {
    const label = this.selectedHpoTermLabel();
    if (!label) return null;
    const lc_label = label.toLowerCase();
    const mapRecord = this.hpoMappingService.availableHpoMap();
    const match = Object.entries(mapRecord).find(
      ([hpo_label, hpo_id]) => hpo_label.toLowerCase() === lc_label 
    );
    console.log("selectedHpoTermId, match", match);
    return match ? match[1] : null;
  });

  hpo_purl = computed(() => {
    const hpo_id = this.hpo_target();
    const formattedId = hpo_id.replace(':', '_');
    return `http://purl.obolibrary.org/obo/${formattedId}`;
  });


  showSvgDialog() {
    const currentHpoId = this.selectedHpoTermId();
    if (! currentHpoId) {
      alert("Could not retrieve HPO id for viewing");
      return;
    }
    this.hpoExampleTerm.set(currentHpoId);
    this.hraViewerRef().open();
  }

  threeDobjectVisible = signal(false);

  show3dObject() {
     const currentHpoId = this.selectedHpoTermId();
    if (! currentHpoId) {
      alert("Could not retrieve HPO id for viewing");
      return;
    }
     this.hpoExampleTerm.set(currentHpoId);
     this.threeDobjectVisible.set(true);
  }


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
    const hraRecordSignal = this.hpoMappingService.getSvgRecord(hpoyplasiaThymusTermid);
    const record = typeof hraRecordSignal === 'function' ? hraRecordSignal() : hraRecordSignal;
    if (record) {
      const digitalObject = record.digitalObject;
      this.openHraViewer(digitalObject);
    }
  }

  openHraViewer(digitalObject: string) {
    console.log("DO", digitalObject);
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
  

  readonly availableHpoTermLabels = computed(() => Object.keys(this.hpoMappingService.availableHpoMap()));

  filteredTermsOne = computed(() => {
    const typed = this.selectedHpoTermLabel().trim().toLowerCase();
    if (!typed) return [];
    return this.availableHpoTermLabels().filter((t) => t.toLowerCase().includes(typed)).slice(0, 20);
  });



}
