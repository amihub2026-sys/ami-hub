import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeaturedPlan } from './featured-plan';

describe('FeaturedPlan', () => {
  let component: FeaturedPlan;
  let fixture: ComponentFixture<FeaturedPlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturedPlan],
    }).compileComponents();

    fixture = TestBed.createComponent(FeaturedPlan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
