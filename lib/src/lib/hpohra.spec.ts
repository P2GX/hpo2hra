import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Hpohra } from './hpohra';

describe('Hpohra', () => {
  let component: Hpohra;
  let fixture: ComponentFixture<Hpohra>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hpohra]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Hpohra);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
