import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Coustme } from './coustme';

describe('Coustme', () => {
  let component: Coustme;
  let fixture: ComponentFixture<Coustme>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Coustme],
    }).compileComponents();

    fixture = TestBed.createComponent(Coustme);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
