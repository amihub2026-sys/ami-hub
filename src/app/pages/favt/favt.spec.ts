import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Favt } from './favt';

describe('Favt', () => {
  let component: Favt;
  let fixture: ComponentFixture<Favt>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Favt],
    }).compileComponents();

    fixture = TestBed.createComponent(Favt);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
