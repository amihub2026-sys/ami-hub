import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSubcategories } from './admin-subcategories';

describe('AdminSubcategories', () => {
  let component: AdminSubcategories;
  let fixture: ComponentFixture<AdminSubcategories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSubcategories],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSubcategories);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
