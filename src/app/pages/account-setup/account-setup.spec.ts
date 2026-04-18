import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSetup } from './account-setup';

describe('AccountSetup', () => {
  let component: AccountSetup;
  let fixture: ComponentFixture<AccountSetup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountSetup],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountSetup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
