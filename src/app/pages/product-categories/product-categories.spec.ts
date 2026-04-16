import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductCategories } from './product-categories';

describe('ProductCategories', () => {
  let component: ProductCategories;
  let fixture: ComponentFixture<ProductCategories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCategories],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCategories);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
