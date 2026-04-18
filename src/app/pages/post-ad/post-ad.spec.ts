import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostAd } from './post-ad';

describe('PostAd', () => {
  let component: PostAd;
  let fixture: ComponentFixture<PostAd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostAd],
    }).compileComponents();

    fixture = TestBed.createComponent(PostAd);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
