import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HpoMapService, parseCsvLine } from './hpo-mapper';

describe('parseCsvLine', () => {
  it('splits plain unquoted fields on commas', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('keeps a comma inside a quoted field as part of that field', () => {
    expect(parseCsvLine('a,"b, c",d')).toEqual(['a', 'b, c', 'd']);
  });

  it('unescapes a doubled quote inside a quoted field', () => {
    expect(parseCsvLine('a,"say ""hi""",c')).toEqual(['a', 'say "hi"', 'c']);
  });
});

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

  it('parses a row whose quoted term_label contains a comma without shifting columns', () => {
    const csvWithCommaInLabel = [
      'hpo_iri,hpo_label,term,term_label,do_type,digital_object,file_url',
      'http://purl.obolibrary.org/obo/HP_0020112,Increased regulatory T cell proportion,http://purl.obolibrary.org/obo/CL_0000792,"CD4-positive, CD25-positive, alpha-beta regulatory T cell",2d-ftu,https://purl.humanatlas.io/2d-ftu/thymus-thymus-lobule,https://cdn.humanatlas.io/digital-objects/2d-ftu/thymus-thymus-lobule/v1.4/assets/2d-ftu-thymus-thymus-lobule.svg',
    ].join('\n');

    httpMock.expectOne('assets/hpo-hra-relevant-dos.csv').flush(csvWithCommaInLabel);

    const record = service.getSvgRecord('HP:0020112')();

    expect(record?.termLabel).toBe('CD4-positive, CD25-positive, alpha-beta regulatory T cell');
    expect(record?.fileUrl).toBe(
      'https://cdn.humanatlas.io/digital-objects/2d-ftu/thymus-thymus-lobule/v1.4/assets/2d-ftu-thymus-thymus-lobule.svg'
    );
  });
});
