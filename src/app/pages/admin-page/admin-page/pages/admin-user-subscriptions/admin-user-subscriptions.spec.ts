import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminUserSubscriptions } from './admin-user-subscriptions';

describe('AdminUserSubscriptions', () => {
  let component: AdminUserSubscriptions;
  let fixture: ComponentFixture<AdminUserSubscriptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUserSubscriptions],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUserSubscriptions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
