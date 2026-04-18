import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceCustom } from './service-custom';

describe('ServiceCustom', () => {
  let component: ServiceCustom;
  let fixture: ComponentFixture<ServiceCustom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceCustom],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceCustom);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
