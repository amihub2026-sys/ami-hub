import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SupabaseService } from './services/supabase.service';
import { supabase } from '../supabaseClient';
import { LocationPickerComponent } from './pages/location-picker/location-picker';
import { AppLocationResult } from './services/location-search';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    LocationPickerComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  notificationCount = 0;

  selectedCity: string = '';
  searchText: string = '';

  cities: string[] = [
    'Chennai',
    'Madurai',
    'Coimbatore',
    'Bangalore',
    'Hyderabad'
  ];

  filteredItems: any[] = [];
  items: any[] = [];

  showAd = true;
  showTopAd = true;
  menuOpen = false;

  searchTerm = '';
  searchCategory = 'All';
  filterOptions = [
    'All',
    'Products',
    'Services',
    'Mobiles',
    'Electronics',
    'Fashion',
    'Vehicles'
  ];

  showLocationPicker = false;
  selectedLocation: AppLocationResult | null = null;

  activeService: string | null = null;

  selectedRadiusKm: number = 5;
  radiusOptions: number[] = [2, 5, 10, 15, 25, 50];

  currentUrl: string = '';

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  openService(service: string) {
    this.activeService = service;
  }

  closeService() {
    this.activeService = null;
  }

  async ngOnInit(): Promise<void> {
    this.currentUrl = this.router.url;

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentUrl = event.urlAfterRedirects || event.url || this.router.url;
        this.cdr.detectChanges();
      });

    await this.loadSavedLocation();
    await this.loadNotificationCount();
    this.cdr.detectChanges();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private hasLocalUserLogin(): boolean {
    if (!this.isBrowser()) return false;
    return localStorage.getItem('userToken') === 'loggedUser';
  }

  private async isLoggedIn(): Promise<boolean> {
    if (!this.isBrowser()) return false;

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session check error:', error);
      }

      const user = data.session?.user;
      const isAdmin = localStorage.getItem('adminToken') === 'loggedAdmin';
      const isLocalUser = localStorage.getItem('userToken') === 'loggedUser';

      return !!user || isAdmin || isLocalUser;
    } catch (error) {
      console.error('isLoggedIn error:', error);
      return this.hasLocalUserLogin();
    }
  }

  private redirectToLogin(redirectTo: string): void {
    this.router.navigate(['/login'], {
      state: { redirectTo }
    });
  }

  get shouldHideGlobalAds(): boolean {
    const url = this.currentUrl.toLowerCase();

    return (
      url.includes('/edit-post/') ||
      url === '/post-ad' ||
      url.startsWith('/post-ad/') ||
      url === '/service' ||
      url.startsWith('/service/') ||
      url.includes('login') ||
      url.includes('register') ||
      url.includes('signup') ||
      url.includes('auth')
    );
  }

  private async loadSavedLocation(): Promise<void> {
    if (!this.isBrowser()) return;

    const savedCity = localStorage.getItem('selectedCity');
    if (savedCity) {
      this.selectedCity = savedCity;
    }

    const savedRadius = localStorage.getItem('selectedRadiusKm');
    if (savedRadius && !isNaN(Number(savedRadius))) {
      this.selectedRadiusKm = Number(savedRadius);
    }

    const savedLocation = localStorage.getItem('amh_selected_location');
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);

        this.selectedLocation = {
          ...parsedLocation,
          lat: parsedLocation?.lat != null ? Number(parsedLocation.lat) : null,
          lon: parsedLocation?.lon != null ? Number(parsedLocation.lon) : null
        } as AppLocationResult;

        if (!this.selectedCity && this.selectedLocation?.city?.trim()) {
          this.selectedCity = this.selectedLocation.city.trim();
        } else if (!this.selectedCity && this.selectedLocation?.displayName?.trim()) {
          this.selectedCity = this.selectedLocation.displayName.trim();
        } else if (!this.selectedCity && this.selectedLocation?.name?.trim()) {
          this.selectedCity = this.selectedLocation.name.trim();
        }
      } catch (error) {
        console.error('Failed to parse saved location', error);
        localStorage.removeItem('amh_selected_location');
      }
    }
  }

  async loadNotificationCount(): Promise<void> {
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user && !this.hasLocalUserLogin()) {
        this.notificationCount = 0;
        return;
      }

      if (!user) {
        this.notificationCount = 0;
        return;
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('userid', user.id)
        .eq('isread', false);

      if (error) {
        console.log('Notification count error', error);
        this.notificationCount = 0;
        return;
      }

      this.notificationCount = count || 0;
      this.cdr.detectChanges();
    } catch (e) {
      console.log('Notification count error', e);
      this.notificationCount = 0;
    }
  }

  goToNotifications(): void {
    this.isLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        this.redirectToLogin('notification');
        return;
      }

      if (this.router.url === '/notification') {
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/notification']);
        });
        return;
      }

      this.router.navigate(['/notification']);
    });
  }

  goToFavorites(): void {
    this.isLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        this.redirectToLogin('favt');
        return;
      }

      if (this.router.url === '/favt') {
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/favt']);
        });
        return;
      }

      this.router.navigate(['/favt']);
    });
  }

  goToChat(): void {
    this.isLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        this.redirectToLogin('chats');
        return;
      }

      if (this.router.url === '/chats') {
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/chats']);
        });
        return;
      }

      this.router.navigate(['/chats']);
    });
  }

  goToProfile(): void {
    this.isLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        this.redirectToLogin('seller-profile');
        return;
      }

      if (this.router.url === '/seller-profile') {
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/seller-profile']);
        });
        return;
      }

      this.router.navigate(['/seller-profile']);
    });
  }

  onCityChange(): void {
    if (this.isBrowser()) {
      localStorage.setItem('selectedCity', this.selectedCity);
    }

    if (this.selectedCity) {
      this.selectedLocation = {
        placeId: '',
        displayName: this.selectedCity,
        lat: 0,
        lon: 0,
        name: this.selectedCity,
        city: this.selectedCity,
        state: '',
        country: 'India',
        postalCode: ''
      } as AppLocationResult;

      if (this.isBrowser()) {
        localStorage.setItem(
          'amh_selected_location',
          JSON.stringify(this.selectedLocation)
        );
      }
    } else {
      this.selectedLocation = null;
      if (this.isBrowser()) {
        localStorage.removeItem('amh_selected_location');
      }
    }

    this.filterByCity();
    this.cdr.detectChanges();
  }

  search(): void {
    this.filterByCity();
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  private calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const earthRadiusKm = 6371;

    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  private hasValidCoordinates(value: any): boolean {
    return (
      value &&
      value.lat != null &&
      value.lon != null &&
      !isNaN(Number(value.lat)) &&
      !isNaN(Number(value.lon))
    );
  }

  filterByCity(): void {
    const searchValue = this.searchText.trim().toLowerCase();

    if (!this.items?.length) {
      this.filteredItems = [];
      return;
    }

    const hasSelectedLocationCoords = this.hasValidCoordinates(this.selectedLocation);

    if (!this.selectedCity && !hasSelectedLocationCoords) {
      this.filteredItems = this.items.filter((item: any) =>
        !searchValue || item.title?.toLowerCase().includes(searchValue)
      );
      return;
    }

    if (hasSelectedLocationCoords) {
      const originLat = Number(this.selectedLocation!.lat);
      const originLon = Number(this.selectedLocation!.lon);

      this.filteredItems = this.items.filter((item: any) => {
        const titleMatch =
          !searchValue || item.title?.toLowerCase().includes(searchValue);

        const itemHasCoords =
          item?.lat != null &&
          item?.lon != null &&
          !isNaN(Number(item.lat)) &&
          !isNaN(Number(item.lon));

        if (itemHasCoords) {
          const distanceKm = this.calculateDistanceKm(
            originLat,
            originLon,
            Number(item.lat),
            Number(item.lon)
          );

          item.distanceKm = Number(distanceKm.toFixed(1));
          return titleMatch && distanceKm <= this.selectedRadiusKm;
        }

        const cityMatch =
          item.city?.toLowerCase() === this.selectedCity.toLowerCase();

        return titleMatch && cityMatch;
      });

      this.filteredItems.sort((a: any, b: any) => {
        const distA = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const distB = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
        return distA - distB;
      });

      return;
    }

    this.filteredItems = this.items.filter((item: any) => {
      const cityMatch =
        item.city?.toLowerCase() === this.selectedCity.toLowerCase();

      const titleMatch =
        !searchValue || item.title?.toLowerCase().includes(searchValue);

      return cityMatch && titleMatch;
    });
  }

  onRadiusChange(): void {
    if (this.isBrowser()) {
      localStorage.setItem('selectedRadiusKm', String(this.selectedRadiusKm));
    }

    this.filterByCity();
    this.cdr.detectChanges();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  doSearch(): void {
    const query = this.searchTerm.trim();
    const category = this.searchCategory === 'All' ? '' : this.searchCategory;

    this.router.navigate(['/'], {
      queryParams: {
        search: query || null,
        filter: category || null
      }
    });

    this.closeMenu();
  }

  goToMyPosts(): void {
    this.isLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        this.router.navigate(['/login'], {
          state: { redirectTo: 'my-posts' }
        });
        return;
      }

      this.router.navigate(['/my-posts']);
    });
  }

  postProduct(): void {
    this.isLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        this.router.navigate(['/login'], {
          state: { redirectTo: 'post-ad' }
        });
        return;
      }

      const isAdmin =
        this.isBrowser() && localStorage.getItem('adminToken') === 'loggedAdmin';
      const userTypeId = this.isBrowser()
        ? Number(localStorage.getItem('userTypeId'))
        : 0;

      if (isAdmin || userTypeId === 2) {
        this.router.navigate(['/post-ad']);
        return;
      }

      this.router.navigate(['/seller-profile'], {
        state: { next: 'post-ad' }
      });
    });
  }

  async postService(): Promise<void> {
    const user = await this.supabaseService.getCurrentUser();
    const localLoggedIn = this.hasLocalUserLogin();

    if (!user && !localLoggedIn) {
      alert('Please login first');
      this.router.navigate(['/login']);
      return;
    }

    if (!user && localLoggedIn) {
      this.router.navigate(['/service']);
      return;
    }

    const result = await this.supabaseService.checkSellerProfileCompleted();

    if (!result.completed) {
      this.router.navigate(['/seller-profile'], {
        state: { next: 'post-service' }
      });
      return;
    }

    this.router.navigate(['/service']);
  }

  toggleLocationPicker(): void {
    this.showLocationPicker = !this.showLocationPicker;
    this.cdr.detectChanges();
  }

  closeLocationPicker(): void {
    this.showLocationPicker = false;
    this.cdr.detectChanges();
  }

  onLocationSelected(location: AppLocationResult): void {
    this.selectedLocation = {
      ...location,
      lat: location?.lat != null ? Number(location.lat) : null,
      lon: location?.lon != null ? Number(location.lon) : null
    } as AppLocationResult;

    this.selectedCity =
      this.selectedLocation.city?.trim() ||
      this.selectedLocation.displayName?.trim() ||
      this.selectedLocation.name?.trim() ||
      '';

    if (this.isBrowser()) {
      localStorage.setItem(
        'amh_selected_location',
        JSON.stringify(this.selectedLocation)
      );

      if (this.selectedCity) {
        localStorage.setItem('selectedCity', this.selectedCity);
      } else {
        localStorage.removeItem('selectedCity');
      }

      localStorage.setItem('selectedRadiusKm', String(this.selectedRadiusKm));
    }

    this.filterByCity();
    this.showLocationPicker = false;
    this.cdr.detectChanges();
  }

  clearSelectedLocation(): void {
    this.selectedLocation = null;
    this.selectedCity = '';

    if (this.isBrowser()) {
      localStorage.removeItem('amh_selected_location');
      localStorage.removeItem('selectedCity');
      localStorage.removeItem('selectedRadiusKm');
    }

    this.filterByCity();
    this.cdr.detectChanges();
  }

  get locationLabel(): string {
    if (this.selectedLocation?.city?.trim()) return this.selectedLocation.city.trim();
    if (this.selectedCity?.trim()) return this.selectedCity.trim();
    if (this.selectedLocation?.displayName?.trim()) return this.selectedLocation.displayName.trim();
    if (this.selectedLocation?.name?.trim()) return this.selectedLocation.name.trim();
    return 'Select Location';
  }

  async logout(): Promise<void> {
    await this.supabaseService.signOut();

    if (this.isBrowser()) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userTypeId');
      localStorage.removeItem('supabase_uid');
      localStorage.removeItem('username');
    }

    this.closeMenu();
    this.notificationCount = 0;
    this.cdr.detectChanges();
    this.router.navigate(['/login']);
  }
}