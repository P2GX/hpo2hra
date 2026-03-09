import { TestBed } from '@angular/core/testing';

import { HpoMapService } from './hpo-mapper';

describe('HpoMapService', () => {
  let service: HpoMapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HpoMapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
