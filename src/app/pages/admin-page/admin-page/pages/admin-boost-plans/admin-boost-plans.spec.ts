import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminBoostPlans } from './admin-boost-plans';

describe('AdminBoostPlans', () => {
  let component: AdminBoostPlans;
  let fixture: ComponentFixture<AdminBoostPlans>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBoostPlans],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminBoostPlans);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
