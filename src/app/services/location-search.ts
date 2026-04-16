import { Injectable } from '@angular/core';

export interface AppLocationResult {
  placeId: string;
  displayName: string;
  lat: number;
  lon: number;
  name: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

declare const google: any;

@Injectable({
  providedIn: 'root'
})
export class LocationSearchService {
  private autocompleteService: any;
  private placesService: any;
  private geocoder: any;

  constructor() {
    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      this.autocompleteService = new google.maps.places.AutocompleteService();
      this.geocoder = new google.maps.Geocoder();

      const div = document.createElement('div');
      this.placesService = new google.maps.places.PlacesService(div);
    }
  }

  private ensureGoogleReady(): void {
    if (!(window as any).google?.maps) {
      throw new Error('Google Maps API not loaded');
    }

    if (!this.autocompleteService) {
      this.autocompleteService = new google.maps.places.AutocompleteService();
    }

    if (!this.geocoder) {
      this.geocoder = new google.maps.Geocoder();
    }

    if (!this.placesService) {
      const div = document.createElement('div');
      this.placesService = new google.maps.places.PlacesService(div);
    }
  }

  async searchLocations(query: string): Promise<AppLocationResult[]> {
    this.ensureGoogleReady();

    return new Promise((resolve) => {
      this.autocompleteService.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'in' }
        },
        async (predictions: any[] | null, status: string) => {
          if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !predictions?.length
          ) {
            resolve([]);
            return;
          }

          const results = await Promise.all(
            predictions.slice(0, 5).map((prediction) =>
              this.getPlaceDetails(prediction.place_id, prediction.description)
            )
          );

          resolve(results.filter((item): item is AppLocationResult => item !== null));
        }
      );
    });
  }

  private async getPlaceDetails(
    placeId: string,
    fallbackText: string
  ): Promise<AppLocationResult | null> {
    this.ensureGoogleReady();

    return new Promise((resolve) => {
      this.placesService.getDetails(
        {
          placeId,
          fields: [
            'place_id',
            'formatted_address',
            'geometry',
            'address_components',
            'name'
          ]
        },
        (place: any, status: string) => {
          if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !place?.geometry?.location
          ) {
            resolve(null);
            return;
          }

          const parsed = this.parseAddressComponents(place.address_components || []);

          resolve({
            placeId: place.place_id || placeId,
            displayName: place.formatted_address || fallbackText,
            lat: place.geometry.location.lat(),
            lon: place.geometry.location.lng(),
            name: place.name || fallbackText,
            city: parsed.city,
            state: parsed.state,
            country: parsed.country,
            postalCode: parsed.postalCode
          });
        }
      );
    });
  }

  async reverseGeocode(
    lat: number,
    lon: number
  ): Promise<AppLocationResult | null> {
    this.ensureGoogleReady();

    return new Promise((resolve) => {
      this.geocoder.geocode(
        { location: { lat, lng: lon } },
        (results: any[] | null, status: string) => {
          if (status !== 'OK' || !results?.length) {
            resolve(null);
            return;
          }

          const preferred =
            results.find((r) =>
              (r.types || []).some((t: string) =>
                ['premise', 'subpremise', 'establishment', 'point_of_interest'].includes(t)
              )
            ) ||
            results.find((r) =>
              (r.types || []).includes('street_address')
            ) ||
            results[0];

          const parsed = this.parseAddressComponents(preferred.address_components || []);

          resolve({
            placeId: preferred.place_id || '',
            displayName: preferred.formatted_address || `Lat ${lat}, Lon ${lon}`,
            lat,
            lon,
            name: preferred.formatted_address || 'Selected location',
            city: parsed.city,
            state: parsed.state,
            country: parsed.country,
            postalCode: parsed.postalCode
          });
        }
      );
    });
  }

  private parseAddressComponents(components: any[]) {
    let city = '';
    let state = '';
    let country = '';
    let postalCode = '';

    for (const c of components) {
      const types = c.types || [];

      if (types.includes('locality')) {
        city = c.long_name;
      }

      if (!city && types.includes('administrative_area_level_2')) {
        city = c.long_name;
      }

      if (types.includes('administrative_area_level_1')) {
        state = c.long_name;
      }

      if (types.includes('country')) {
        country = c.long_name;
      }

      if (types.includes('postal_code')) {
        postalCode = c.long_name;
      }
    }

    return { city, state, country, postalCode };
  }
}