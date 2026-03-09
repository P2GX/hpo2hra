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
  it('should return mapping for Abnormal renal arteriole endothelium morphology', async () => {
    const mappings = await service.mapToHra('HP:0033895');
    
    expect(mappings).toEqual(['ADD_MAPPINGS_HERE']);
  });
});
