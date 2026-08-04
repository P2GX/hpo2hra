import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { HpoMapService } from '../service/hpo-mapper';
import { HraRecord } from '../model/model';
import { JsonPipe } from '@angular/common'; // <--- Add this import

@Component({
  selector: 'app-hra-viewer',
  imports: [JsonPipe],
  templateUrl: './hra-viewer.component.html',
  styleUrl: './hra-viewer.component.scss',
})
export class HraViewerComponent {
    title = input.required<string>();
    // the page will be hosted within an HPO page from which we get the HPO Term identifier
    hpoId = input.required<string>();
    // prototype file-based database that has map between HPO id and the corresponding HRA assets (via either CL or UBERON terms)
    hpoMappingService = inject(HpoMapService);
    // We can use this to open a dialog that will contain the new HRA content
    private dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('hraDialogViewerEl');
    // Retrieve contents of the data based for the current HPO identifier
    // in this prototype, we do not check whether such a record exists -- we need to decide what the desired behavior is
    currentRecord = computed(() => {
       const termId = this.hpoId();
       if (! termId) return null;
       const hraRecordSignal = this.hpoMappingService.getSvgRecord(termId);
       const record = typeof hraRecordSignal === 'function' ? hraRecordSignal() : hraRecordSignal;
       return record || null;
    });
    // We may want to do something when the user closes the HRA widget, in which case we would need other outputs
    closed = output<void>();
    

    open() {
      console.log("Opening Viewer hpoId?", this.hpoId());
        this.dialogEl().nativeElement.show();
    }

    openHra() {
      this.open();
  }

    protected closeDialog() {
      this.dialogEl().nativeElement.close();
  }

  onNativeClose() {
    this.closed.emit();
  }

  onIconClick(url: string): void {
  // For now, just show an alert
  alert('Clicked URL: ' + url);
  
  // Later, you can add navigation or viewer-opening logic here
}


}