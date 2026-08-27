import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HpoTerms } from './hpo-terms';

const CSV_FIXTURE = [
  'hpo_iri,hpo_label,term,term_label,do_type,digital_object,file_url',
  'http://purl.obolibrary.org/obo/HP_0002097,Emphysema,http://purl.obolibrary.org/obo/UBERON_0002048,lung,2d-ftu,https://purl.humanatlas.io/2d-ftu/lung,https://cdn.humanatlas.io/digital-objects/2d-ftu/lung/v1/assets/2d-ftu-lung.svg',
].join('\n');

describe('HpoTerms', () => {
  let service: HpoTerms;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HpoTerms);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('resolves an id for a known label and lists available labels', () => {
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);

    expect(service.idForLabel('Emphysema')).toBe('HP:0002097');
    expect(service.availableLabels()).toEqual(['Emphysema']);
  });

  it('returns null for an unknown label', () => {
    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(CSV_FIXTURE);

    expect(service.idForLabel('Not A Real Term')).toBeNull();
  });
});
