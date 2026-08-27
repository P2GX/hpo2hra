import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Hpohra } from './hpohra';

const CSV_FIXTURE = [
  'hpo_iri,hpo_label,term,term_label,do_type,digital_object,file_url',
  'http://purl.obolibrary.org/obo/HP_0002097,Emphysema,http://purl.obolibrary.org/obo/UBERON_0002048,lung,2d-ftu,https://purl.humanatlas.io/2d-ftu/lung,https://cdn.humanatlas.io/digital-objects/2d-ftu/lung/v1/assets/2d-ftu-lung.svg',
].join('\n');

describe('Hpohra', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Hpohra],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('renders the resolved illustration for a known hpoId', () => {
    const fixture = TestBed.createComponent(Hpohra);
    fixture.componentRef.setInput('hpoId', 'HP:0002097');
    fixture.detectChanges();
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);
    fixture.detectChanges();

    const illustration = fixture.nativeElement.querySelector('hra-medical-illustration');
    expect(illustration?.selectedIllustration).toBe('https://purl.humanatlas.io/2d-ftu/lung');
    expect(illustration?.highlight).toEqual(['http://purl.obolibrary.org/obo/UBERON_0002048']);
  });

  it('renders a fallback message for an unknown hpoId', () => {
    const fixture = TestBed.createComponent(Hpohra);
    fixture.componentRef.setInput('hpoId', 'HP:0000000');
    fixture.detectChanges();
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('hra-medical-illustration')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No HRA illustration found for HP:0000000');
  });
});
