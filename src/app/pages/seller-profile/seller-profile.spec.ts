import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SellerProfileComponent } from './seller-profile';

describe('SellerProfileComponent', () => {

  let component: SellerProfileComponent;
  let fixture: ComponentFixture<SellerProfileComponent>;

  beforeEach(async () => {

    await TestBed.configureTestingModule({
      imports: [SellerProfileComponent]   // standalone component
    })
    .compileComponents();

    fixture = TestBed.createComponent(SellerProfileComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

});