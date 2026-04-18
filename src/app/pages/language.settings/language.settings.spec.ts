import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanguageSettings } from './language.settings';

describe('LanguageSettings', () => {
  let component: LanguageSettings;
  let fixture: ComponentFixture<LanguageSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
