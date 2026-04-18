import { TestBed } from '@angular/core/testing';

import { LocationSearch } from './location-search';

describe('LocationSearch', () => {
  let service: LocationSearch;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocationSearch);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
