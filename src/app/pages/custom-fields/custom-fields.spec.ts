import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomFields } from './custom-fields';

describe('CustomFields', () => {
  let component: CustomFields;
  let fixture: ComponentFixture<CustomFields>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomFields],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomFields);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
