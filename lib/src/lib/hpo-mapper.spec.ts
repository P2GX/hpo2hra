import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HpoMapService } from './hpo-mapper';

const CSV_FIXTURE = [
  'hpo_iri,hpo_label,term,term_label,do_type,digital_object,file_url',
  'http://purl.obolibrary.org/obo/HP_0002097,Emphysema,http://purl.obolibrary.org/obo/UBERON_0002048,lung,2d-ftu,https://purl.humanatlas.io/2d-ftu/lung,https://cdn.humanatlas.io/digital-objects/2d-ftu/lung/v1/assets/2d-ftu-lung.svg',
].join('\n');

describe('HpoMapService', () => {
  let service: HpoMapService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HpoMapService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('parses the CSV and resolves an SVG record by HPO id', () => {
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);

    const record = service.getSvgRecord('HP:0002097')();

    expect(record?.hpoLabel).toBe('Emphysema');
    expect(record?.fileUrl).toBe(
      'https://cdn.humanatlas.io/digital-objects/2d-ftu/lung/v1/assets/2d-ftu-lung.svg'
    );
  });

  it('returns null for an unknown HPO id', () => {
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);

    expect(service.getSvgRecord('HP:9999999')()).toBeNull();
  });

  it('exposes the label to id map for autocomplete-style lookups', () => {
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);

    expect(service.availableHpoMap()).toEqual({ Emphysema: 'HP:0002097' });
  });
});
