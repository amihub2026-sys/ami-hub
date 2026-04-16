import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  Output,
  ViewChild,
  PLATFORM_ID,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LocationSearchService,
  type AppLocationResult
} from '../../services/location-search';

declare const google: any;

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-picker.html',
  styleUrls: ['./location-picker.css']
})
export class LocationPickerComponent implements AfterViewInit {
  @ViewChild('mapRef', { static: false })
  mapRef!: ElementRef<HTMLDivElement>;

  @Input() initialQuery = '';
  @Input() initialLat: number | null = null;
  @Input() initialLon: number | null = null;

  @Output() locationSelected = new EventEmitter<AppLocationResult>();

  query = '';
  loading = false;
  suggestions: AppLocationResult[] = [];
  isBrowser = false;

  private map: any;
  private marker: any;

  currentLat: number | null = null;
  currentLon: number | null = null;
  currentResult: AppLocationResult | null = null;

  constructor(
    private readonly locationSearchService: LocationSearchService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;

    this.query = this.initialQuery || '';
    await this.waitForGoogleAndInitMap();
  }

  private async waitForGoogleAndInitMap(): Promise<void> {
    let tries = 0;

    while (tries < 50) {
      if ((window as any).google?.maps && this.mapRef?.nativeElement) {
        await this.initMap();
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      tries++;
    }

    console.error('Google Maps API not loaded after waiting');
  }

  private async initMap(): Promise<void> {
    if (!this.mapRef?.nativeElement) return;
    if (!(window as any).google?.maps) return;

    const lat = this.initialLat ?? 11.0168;
    const lon = this.initialLon ?? 76.9558;
    const zoom = this.initialLat != null && this.initialLon != null ? 18 : 13;

    this.currentLat = lat;
    this.currentLon = lon;

    this.map = new google.maps.Map(this.mapRef.nativeElement, {
      center: { lat, lng: lon },
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    this.marker = new google.maps.Marker({
      position: { lat, lng: lon },
      map: this.map,
      draggable: true
    });

    this.syncMapToPosition(lat, lon, zoom);

    if (this.initialLat != null && this.initialLon != null) {
      await this.updateAddressFromCoordinates(this.initialLat, this.initialLon);
    } else if (!this.query.trim()) {
      await this.updateAddressFromCoordinates(lat, lon);
    }

    this.marker.addListener('dragend', async () => {
      const position = this.marker.getPosition();
      if (!position) return;

      const newLat = position.lat();
      const newLon = position.lng();

      this.currentLat = newLat;
      this.currentLon = newLon;

      this.syncMapToPosition(newLat, newLon, 18);
      await this.updateAddressFromCoordinates(newLat, newLon);
    });

    this.map.addListener('click', async (event: any) => {
      if (!event?.latLng) return;

      const newLat = event.latLng.lat();
      const newLon = event.latLng.lng();

      this.currentLat = newLat;
      this.currentLon = newLon;

      this.syncMapToPosition(newLat, newLon, 18);
      await this.updateAddressFromCoordinates(newLat, newLon);
    });

    setTimeout(() => {
      google.maps.event.trigger(this.map, 'resize');
      this.syncMapToPosition(this.currentLat ?? lat, this.currentLon ?? lon, zoom);
    }, 300);
  }

  private syncMapToPosition(lat: number, lon: number, zoom = 18): void {
    if (!this.map) return;

    const position = { lat: Number(lat), lng: Number(lon) };

    if (Number.isNaN(position.lat) || Number.isNaN(position.lng)) {
      return;
    }

    this.map.panTo(position);
    this.map.setZoom(zoom);

    if (!this.marker) {
      this.marker = new google.maps.Marker({
        position,
        map: this.map,
        draggable: true
      });
    } else {
      this.marker.setPosition(position);
    }
  }

  async onSearchInput(): Promise<void> {
    const q = this.query.trim();

    if (q.length < 3) {
      this.suggestions = [];
      return;
    }

    this.loading = true;

    try {
      this.suggestions = await this.locationSearchService.searchLocations(q);
    } catch (error) {
      console.error('Location search failed:', error);
      this.suggestions = [];
    } finally {
      this.loading = false;
    }
  }

  async chooseLocation(item: AppLocationResult): Promise<void> {
    const lat = Number(item.lat);
    const lon = Number(item.lon);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      console.error('Invalid coordinates from selected location:', item);
      return;
    }

    this.suggestions = [];
    this.currentLat = lat;
    this.currentLon = lon;

    this.syncMapToPosition(lat, lon, 18);
    await this.updateAddressFromCoordinates(lat, lon);
  }

  useCurrentLocation(): void {
    if (!this.isBrowser) {
      alert('Browser location not available');
      return;
    }

    if (!('geolocation' in navigator)) {
      alert('Geolocation not supported');
      return;
    }

    this.loading = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        this.syncMapToPosition(lat, lon, 18);
        await this.updateAddressFromCoordinates(lat, lon);
        this.loading = false;
      },
      (error) => {
        console.error('Current location failed:', error);
        this.loading = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Location permission denied');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location information unavailable');
            break;
          case error.TIMEOUT:
            alert('Location request timed out');
            break;
          default:
            alert('Unable to fetch current location');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  }

  async confirmLocation(): Promise<void> {
    if (this.currentLat == null || this.currentLon == null) {
      alert('Please move or select a location on the map');
      return;
    }

    await this.updateAddressFromCoordinates(this.currentLat, this.currentLon);

    if (!this.currentResult) {
      this.currentResult = {
        placeId: '',
        displayName: this.query?.trim() || 'Selected Location',
        lat: Number(this.currentLat),
        lon: Number(this.currentLon),
        name: this.query?.trim() || 'Selected Location',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      };
    }

    this.locationSelected.emit(this.currentResult);
  }

  private setDisplayState(result: AppLocationResult): void {
    const cleanDisplay =
      result.displayName?.trim() ||
      result.name?.trim() ||
      [
        result.city?.trim(),
        result.state?.trim(),
        result.country?.trim()
      ].filter(Boolean).join(', ') ||
      `Lat ${result.lat}, Lon ${result.lon}`;

    const updatedResult: AppLocationResult = {
      ...result,
      displayName: cleanDisplay,
      name: result.name?.trim() || cleanDisplay,
      lat: Number(result.lat),
      lon: Number(result.lon)
    };

    setTimeout(() => {
      this.query = cleanDisplay;
      this.currentResult = updatedResult;
      this.cdr.detectChanges();
    }, 0);
  }

  private async updateAddressFromCoordinates(
    lat: number,
    lon: number
  ): Promise<void> {
    this.currentLat = lat;
    this.currentLon = lon;

    this.syncMapToPosition(lat, lon, 18);

    try {
      const result = await this.locationSearchService.reverseGeocode(lat, lon);

      if (result) {
        this.setDisplayState({
          ...result,
          lat,
          lon
        });
        return;
      }
    } catch (error) {
      console.error('Reverse geocode failed:', error);
    }

    const fallbackText = `Lat ${lat}, Lon ${lon}`;

    this.setDisplayState({
      placeId: '',
      displayName: fallbackText,
      lat: Number(lat),
      lon: Number(lon),
      name: fallbackText,
      city: '',
      state: '',
      country: '',
      postalCode: ''
    });
  }
}