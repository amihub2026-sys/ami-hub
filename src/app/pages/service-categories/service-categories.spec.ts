import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCategories } from './service-categories';

describe('ServiceCategories', () => {
  let component: ServiceCategories;
  let fixture: ComponentFixture<ServiceCategories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceCategories],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceCategories);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
