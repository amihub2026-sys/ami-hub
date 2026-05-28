import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminUserBoostPlans } from './admin-user-boost-plans';

describe('AdminUserBoostPlans', () => {
  let component: AdminUserBoostPlans;
  let fixture: ComponentFixture<AdminUserBoostPlans>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUserBoostPlans],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUserBoostPlans);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
