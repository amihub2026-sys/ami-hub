import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPosts } from './admin-posts';

describe('AdminPosts', () => {
  let component: AdminPosts;
  let fixture: ComponentFixture<AdminPosts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPosts],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPosts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
