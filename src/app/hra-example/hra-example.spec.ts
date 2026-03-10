import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HraExample } from './hra-example';

describe('HraExample', () => {
  let component: HraExample;
  let fixture: ComponentFixture<HraExample>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HraExample]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HraExample);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
