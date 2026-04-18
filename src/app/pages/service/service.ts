import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  SupabaseService,
  Category,
  Subcategory,
  StateItem,
  CityItem,
  AreaItem
} from '../../services/supabase.service';
import {
  PostDraftService,
  ServiceBlockDraft
} from '../../services/post-draft.service';
import { LocationPickerComponent } from '../location-picker/location-picker';
import {
  LocationSearchService,
  AppLocationResult
} from '../../services/location-search';

@Component({
  selector: 'app-service',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationPickerComponent],
  templateUrl: './service.html',
  styleUrls: ['./service.css']
})
export class Service implements OnInit {
  goToSubscriptionPlans() {
    this.router.navigate(['/subscription-plan']);
  }

  goToFeatureAd(): void {
    if (!this.editPostId) {
      alert('Post id not found');
      return;
    }

    const finalType = this.lockedAdType || this.adType || 'service';

    this.router.navigate(['/featured-plan'], {
      state: {
        postId: Number(this.editPostId),
        adType: finalType
      }
    });
  }

  showSuccess = false;
  isSubmitting = false;
  isEditMode = false;
  editPostId: string | null = null;
  isPageLoading = true;

  adType: string = '';
  lockedAdType: string = '';

  categories: Category[] = [];
  subcategoriesList: Subcategory[] = [];

  selectedMapLocation: AppLocationResult | null = null;

  statesList: StateItem[] = [];
  citiesList: CityItem[] = [];
  areasList: AreaItem[] = [];

  existingMainImageUrl = '';
  existingImageUrls: string[] = [];
  existingVideoUrls: string[] = [];

  private typingTimer: any;

  mainAd = {
    title: '',
    price: null as number | null,
    description: '',
    category: '',
    subcategory: '',
    country: 'India',
    state: '',
    district: '',
    area: '',
    contactphone: '',
    whatsappnumber: '',
    mainPhoto: null as File | null,
    otherImages: [] as File[],
    videos: [] as File[],

    full_address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    place_name: '',
    location_source: 'google'
  };

  serviceBlocks: ServiceBlockDraft[] = [
    { title: '', price: null, image: null }
  ];

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private postDraftService: PostDraftService,
    private locationSearchService: LocationSearchService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    this.ngZone.run(() => {
      this.isPageLoading = true;
      this.cdr.detectChanges();
    });

    try {
      const routeId = this.route.snapshot.paramMap.get('id');
      const navStateId =
        typeof history !== 'undefined' && history.state?.postId
          ? String(history.state.postId)
          : null;

      const id = routeId || navStateId;

      this.editPostId = id;
      this.isEditMode = !!id;

      try {
        const categoriesResult = await Promise.race([
          this.supabaseService.getCategories(),
          new Promise<Category[]>((_, reject) =>
            setTimeout(() => reject(new Error('Categories load timeout')), 10000)
          )
        ]);

        this.ngZone.run(() => {
          this.categories = Array.isArray(categoriesResult) ? categoriesResult : [];
          this.cdr.detectChanges();
        });
      } catch (err) {
        console.error('Error loading categories:', err);
        this.ngZone.run(() => {
          this.categories = [];
          this.cdr.detectChanges();
        });
      }

      try {
        const statesResult = await Promise.race([
          this.supabaseService.getStates(1),
          new Promise<StateItem[]>((_, reject) =>
            setTimeout(() => reject(new Error('States load timeout')), 10000)
          )
        ]);

        this.ngZone.run(() => {
          this.statesList = Array.isArray(statesResult) ? statesResult : [];
          this.cdr.detectChanges();
        });
      } catch (err) {
        console.error('Error loading states:', err);
        this.ngZone.run(() => {
          this.statesList = [];
          this.cdr.detectChanges();
        });
      }

      // CREATE MODE
      if (!id) {
        this.ngZone.run(() => {
          this.adType = 'service';
          this.lockedAdType = '';
          this.isPageLoading = false;
          this.cdr.detectChanges();
        });
        return;
      }

      // EDIT MODE
      let data: any = null;
      let error: any = null;

      try {
        const postResult: any = await Promise.race([
          this.supabaseService.supabase
            .from('post')
            .select('*')
            .eq('postid', Number(id))
            .maybeSingle(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Post load timeout')), 10000)
          )
        ]);

        data = postResult?.data ?? null;
        error = postResult?.error ?? null;
      } catch (err) {
        console.error('Error loading post for edit:', err);
        error = err;
      }

      if (error) {
        console.error('Error loading post for edit:', error);
        alert('Error loading post');
        this.router.navigate(['/my-posts']);
        return;
      }

      if (!data) {
        alert('Post not found');
        this.router.navigate(['/my-posts']);
        return;
      }

      this.ngZone.run(() => {
        this.patchFormFromPost(data);
        this.cdr.detectChanges();
      });

      try {
        await this.rebuildEditDropdowns(data);
      } catch (err) {
        console.error('Error rebuilding edit dropdowns:', err);
      }

      try {
        this.ngZone.run(() => {
          this.rebuildSelectedMapLocation();
          this.cdr.detectChanges();
        });
      } catch (err) {
        console.error('Error rebuilding selected map location:', err);
      }
    } catch (error) {
      console.error('Error initializing page:', error);
      alert('Error opening edit page');
      this.router.navigate(['/my-posts']);
    } finally {
      this.ngZone.run(() => {
        this.isPageLoading = false;
        this.cdr.detectChanges();
      });

      setTimeout(() => {
        this.ngZone.run(() => {
          this.isPageLoading = false;
          this.cdr.detectChanges();
        });
      }, 0);
    }
  }

  get isServiceType(): boolean {
    return this.adType === 'service';
  }

  get isProductType(): boolean {
    return this.adType === 'product';
  }

  private safeParseArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value.filter((item: any) => typeof item === 'string' && item.trim());
    }

    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.filter((item: any) => typeof item === 'string' && item.trim())
          : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  private patchFormFromPost(data: any): void {
    this.mainAd.title = data.title || '';
    this.mainAd.description = data.description || '';
    this.mainAd.price = data.price ?? null;

    this.mainAd.category = data.category || '';
    this.mainAd.subcategory = data.subcategory || '';

    this.mainAd.contactphone = data.contactphone || '';
    this.mainAd.whatsappnumber = data.whatsappnumber || '';

    this.mainAd.full_address =
      data.full_address || data.location || data.address || '';
    this.mainAd.latitude = data.latitude ?? null;
    this.mainAd.longitude = data.longitude ?? null;
    this.mainAd.place_name = data.place_name || '';
    this.mainAd.location_source = data.location_source || 'google';

    this.mainAd.country = data.country || 'India';
    this.mainAd.state = data.state || '';
    this.mainAd.district = data.district || '';
    this.mainAd.area = data.area || '';

    this.existingImageUrls = this.safeParseArray(data.image_urls);
    this.existingVideoUrls = this.safeParseArray(data.video_urls);

    this.existingMainImageUrl =
      typeof data.image_url === 'string' && data.image_url.trim()
        ? data.image_url
        : (this.existingImageUrls.length > 0 ? this.existingImageUrls[0] : '');

    const dbType = String(
      data.adtype || data.conditiontype || 'service'
    ).trim().toLowerCase();

    this.adType = dbType === 'product' ? 'product' : 'service';
    this.lockedAdType = this.adType;

    if (this.adType === 'service') {
      if (Array.isArray(data.catalog) && data.catalog.length > 0) {
        this.serviceBlocks = data.catalog.map((item: any) => ({
          title: item?.title || '',
          price: item?.price ?? null,
          image: null
        }));
      } else {
        this.serviceBlocks = [{ title: '', price: null, image: null }];
      }
    } else {
      this.serviceBlocks = [];
    }
  }

  private async rebuildEditDropdowns(data: any): Promise<void> {
    const selectedCategory =
      this.categories.find(c => c.categoryid === data.categoryid) ||
      this.categories.find(c => c.categoryname === this.mainAd.category);

    if (selectedCategory) {
      this.mainAd.category = selectedCategory.categoryname;
      try {
        this.subcategoriesList = await this.supabaseService.getSubcategories(
          selectedCategory.categoryid
        );
      } catch (err) {
        console.error('Error loading subcategories:', err);
        this.subcategoriesList = [];
      }
    } else {
      this.subcategoriesList = [];
    }

    const selectedSubcategory =
      this.subcategoriesList.find(s => s.subcategoryid === data.subcategoryid) ||
      this.subcategoriesList.find(
        s => s.subcategoryname === this.mainAd.subcategory
      );

    if (selectedSubcategory) {
      this.mainAd.subcategory = selectedSubcategory.subcategoryname;
    }

    const selectedState =
      this.statesList.find(s => s.statename === this.mainAd.state) ||
      this.statesList.find(s => String(s.stateid) === String(data.stateid ?? ''));

    if (selectedState) {
      this.mainAd.state = selectedState.statename;
      try {
        this.citiesList = await this.supabaseService.getCitiesByState(
          selectedState.stateid
        );
      } catch (err) {
        console.error('Error loading cities:', err);
        this.citiesList = [];
      }
    } else {
      this.citiesList = [];
    }

    const selectedCity =
      this.citiesList.find(c => c.cityid === data.cityid) ||
      this.citiesList.find(c => c.cityname === this.mainAd.district);

    if (selectedCity) {
      this.mainAd.district = selectedCity.cityname;
      try {
        this.areasList = await this.supabaseService.getAreasByCity(
          selectedCity.cityid
        );
      } catch (err) {
        console.error('Error loading areas:', err);
        this.areasList = [];
      }
    } else {
      this.areasList = [];
    }

    const selectedArea =
      this.areasList.find(a => a.areaid === data.areaid) ||
      this.areasList.find(a => a.areaname === this.mainAd.area);

    if (selectedArea) {
      this.mainAd.area = selectedArea.areaname;
    }
  }

  private rebuildSelectedMapLocation(): void {
    if (
      this.mainAd.latitude != null &&
      this.mainAd.longitude != null &&
      this.mainAd.full_address
    ) {
      this.selectedMapLocation = {
        placeId: '',
        displayName: this.mainAd.full_address,
        lat: Number(this.mainAd.latitude),
        lon: Number(this.mainAd.longitude),
        name: this.mainAd.place_name || '',
        city: this.mainAd.district || '',
        state: this.mainAd.state || '',
        country: this.mainAd.country || '',
        postalCode: ''
      };
    }
  }

  async onAdTypeChange() {
    if (this.isEditMode) {
      this.adType = this.lockedAdType || this.adType;
      return;
    }

    this.mainAd.category = '';
    this.mainAd.subcategory = '';
    this.subcategoriesList = [];

    if (this.adType === 'product') {
      this.serviceBlocks = [];
    } else {
      if (this.serviceBlocks.length === 0) {
        this.serviceBlocks = [{ title: '', price: null, image: null }];
      }
    }
  }

  async onCategoryChange() {
    this.mainAd.subcategory = '';
    this.subcategoriesList = [];

    const selected = this.categories.find(
      c => c.categoryname === this.mainAd.category
    );

    if (selected) {
      this.subcategoriesList = await this.supabaseService.getSubcategories(
        selected.categoryid
      );
    }
  }

  async onCountryChange() {
    this.mainAd.state = '';
    this.mainAd.district = '';
    this.mainAd.area = '';
    this.citiesList = [];
    this.areasList = [];
    this.statesList = await this.supabaseService.getStates(1);
  }

  async onStateChange() {
    this.mainAd.district = '';
    this.mainAd.area = '';
    this.citiesList = [];
    this.areasList = [];

    const selectedState = this.statesList.find(
      s => s.statename === this.mainAd.state
    );

    if (selectedState) {
      this.citiesList = await this.supabaseService.getCitiesByState(
        selectedState.stateid
      );
    }
  }

  async onDistrictChange() {
    this.mainAd.area = '';
    this.areasList = [];

    const selectedCity = this.citiesList.find(
      c => c.cityname === this.mainAd.district
    );

    if (selectedCity) {
      this.areasList = await this.supabaseService.getAreasByCity(
        selectedCity.cityid
      );
    }
  }

  addAnotherService() {
    if (this.adType !== 'service') {
      return;
    }

    this.serviceBlocks.push({
      title: '',
      price: null,
      image: null
    });
  }

  removeService(i: number) {
    if (this.adType !== 'service') {
      return;
    }

    this.serviceBlocks.splice(i, 1);
  }

  onMainPhotoChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.mainAd.mainPhoto =
      input.files && input.files.length ? input.files[0] : null;
  }

  onOtherImagesChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.mainAd.otherImages = input.files ? Array.from(input.files) : [];
  }

  onVideosChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.mainAd.videos = input.files ? Array.from(input.files) : [];
  }

  onServiceImageChange(e: Event, i: number) {
    if (this.adType !== 'service') {
      return;
    }

    const input = e.target as HTMLInputElement;
    this.serviceBlocks[i].image =
      input.files && input.files.length ? input.files[0] : null;
  }

  removeExistingMainImage() {
    this.existingMainImageUrl = '';
  }

  removeExistingOtherImage(i: number) {
    this.existingImageUrls.splice(i, 1);
    this.existingImageUrls = [...this.existingImageUrls];

    if (!this.existingMainImageUrl && this.existingImageUrls.length > 0) {
      this.existingMainImageUrl = this.existingImageUrls[0];
    }
  }

  removeExistingVideo(i: number) {
    this.existingVideoUrls.splice(i, 1);
    this.existingVideoUrls = [...this.existingVideoUrls];
  }

  onMapLocationSelected(location: AppLocationResult): void {
    this.selectedMapLocation = location;

    this.mainAd.country = location.country || this.mainAd.country;
    this.mainAd.state = location.state || this.mainAd.state;
    this.mainAd.district = location.city || this.mainAd.district;
    this.mainAd.area = location.displayName || this.mainAd.area;

    this.mainAd.full_address = location.displayName || this.mainAd.full_address;
    this.mainAd.latitude = Number(location.lat);
    this.mainAd.longitude = Number(location.lon);
    this.mainAd.place_name =
      location.name || location.city || this.mainAd.place_name;
    this.mainAd.location_source = 'google';
  }

  onAddressTyping(): void {
    if (!this.mainAd.full_address || this.mainAd.full_address.trim().length < 5) {
      return;
    }

    clearTimeout(this.typingTimer);

    this.typingTimer = setTimeout(() => {
      this.triggerAutoGeocode();
    }, 700);
  }

  async triggerAutoGeocode(): Promise<void> {
    const query = this.mainAd.full_address?.trim();
    if (!query || query.length < 5) return;

    try {
      const results = await this.locationSearchService.searchLocations(query);

      if (!Array.isArray(results) || results.length === 0) {
        return;
      }

      const item = results[0];
      if (!item) return;

      this.mainAd.latitude = Number(item.lat);
      this.mainAd.longitude = Number(item.lon);
      this.mainAd.full_address = item.displayName || this.mainAd.full_address;

      this.mainAd.country = item.country || this.mainAd.country;
      this.mainAd.state = item.state || this.mainAd.state;
      this.mainAd.district = item.city || this.mainAd.district;
      this.mainAd.area = item.displayName || this.mainAd.area;

      this.mainAd.place_name =
        item.name || item.city || this.mainAd.place_name;

      this.mainAd.location_source = 'google';

      this.selectedMapLocation = {
        placeId: item.placeId ?? '',
        displayName: item.displayName ?? '',
        lat: Number(item.lat),
        lon: Number(item.lon),
        name: item.name ?? '',
        city: item.city || '',
        state: item.state || '',
        country: item.country || '',
        postalCode: item.postalCode || ''
      };
    } catch (err) {
      console.error('Auto geocode error:', err);
    }
  }

  confirmLocation(): void {
    if (!this.mainAd.full_address?.trim()) {
      alert('Please enter full address');
      return;
    }

    if (this.mainAd.latitude == null || this.mainAd.longitude == null) {
      alert('Please move pin or select location on map');
      return;
    }

    alert('Location confirmed');
  }

  private validateForm(): boolean {
    if (!this.mainAd.title.trim()) {
      alert('Enter title');
      return false;
    }

    if (!this.mainAd.description.trim()) {
      alert('Enter description');
      return false;
    }

    if (!this.mainAd.category) {
      alert('Select category');
      return false;
    }

    if (!this.mainAd.subcategory) {
      alert('Select subcategory');
      return false;
    }

    if (
      !this.mainAd.full_address ||
      this.mainAd.latitude == null ||
      this.mainAd.longitude == null
    ) {
      alert('Please select location');
      return false;
    }

    return true;
  }

  private buildCatalogDraft() {
    if (this.adType !== 'service') {
      return [];
    }

    return this.serviceBlocks
      .map(block => ({
        title: block.title?.trim() || '',
        price: block.price ?? null,
        imageName: block.image?.name || ''
      }))
      .filter(item => item.title || item.price !== null || item.imageName);
  }

  async submitByType(flowType: 'normal' | 'featured' = 'normal') {
    if (this.isSubmitting) return;
    if (!this.validateForm()) return;

    if (!this.isEditMode && flowType === 'featured') {
      alert('Please post your product or service first. After posting, you can feature the ad later.');
      return;
    }

    this.isSubmitting = true;

    try {
      const user = await this.supabaseService.getCurrentUser();

      if (!user) {
        alert('Please login first');
        this.router.navigate(['/login']);
        return;
      }

      const selectedCategory = this.categories.find(
        c => c.categoryname === this.mainAd.category
      );

      const selectedSubcategory = this.subcategoriesList.find(
        s => s.subcategoryname === this.mainAd.subcategory
      );

      const selectedCity = this.citiesList.find(
        c => c.cityname === this.mainAd.district
      );

      const selectedArea = this.areasList.find(
        a => a.areaname === this.mainAd.area
      );

      if (this.isEditMode && this.editPostId) {
        const finalType = this.lockedAdType || this.adType;

        const updatePayload: any = {
          categoryid: selectedCategory?.categoryid ?? null,
          subcategoryid: selectedSubcategory?.subcategoryid ?? null,
          title: this.mainAd.title.trim(),
          description: this.mainAd.description.trim(),
          price: this.mainAd.price ?? 0,
          currencycode: 'INR',
          adtype: finalType,
          conditiontype: finalType,
          cityid: selectedCity?.cityid ?? null,
          areaid: selectedArea?.areaid ?? null,
          contactphone: this.mainAd.contactphone || '',
          whatsappnumber: this.mainAd.whatsappnumber || '',
          category: this.mainAd.category || '',
          subcategory: this.mainAd.subcategory || '',
          location: this.mainAd.full_address,
          address: this.mainAd.full_address,
          latitude: this.mainAd.latitude,
          longitude: this.mainAd.longitude,
          full_address: this.mainAd.full_address,
          place_name: this.mainAd.place_name,
          location_source: this.mainAd.location_source,
          country: this.mainAd.country,
          state: this.mainAd.state,
          district: this.mainAd.district,
          area: this.mainAd.area,
          image_url: this.existingMainImageUrl || '',
          image_urls: this.existingImageUrls,
          video_urls: this.existingVideoUrls,
          catalog: finalType === 'service' ? this.buildCatalogDraft() : [],
          custom_fields: {
            country: this.mainAd.country,
            state: this.mainAd.state,
            district: this.mainAd.district,
            area: this.mainAd.area,
            full_address: this.mainAd.full_address,
            latitude: this.mainAd.latitude,
            longitude: this.mainAd.longitude,
            place_name: this.mainAd.place_name
          }
        };

        const { error } = await this.supabaseService.supabase
          .from('post')
          .update(updatePayload)
          .eq('postid', this.editPostId);

        if (error) {
          console.error('Error updating post:', error);
          alert('Error updating post');
          return;
        }

        alert('Post updated successfully');
        this.router.navigate(['/my-posts']);
        return;
      }

      const rawPayload: any = {
        userid: String(user.id),
        categoryid: selectedCategory?.categoryid ?? null,
        subcategoryid: selectedSubcategory?.subcategoryid ?? null,
        title: this.mainAd.title.trim(),
        description: this.mainAd.description.trim(),
        price: this.mainAd.price ?? 0,
        currencycode: 'INR',

        adtype: this.adType,
        conditiontype: this.adType,

        status: 'Processing',
        isfeatured: false,
        is_featured: false,
        featured_plan_id: null,
        featured_plan_name: null,
        isactive: false,

        cityid: selectedCity?.cityid ?? null,
        areaid: selectedArea?.areaid ?? null,

        contactname:
          user.user_metadata?.['full_name'] ||
          user.user_metadata?.['name'] ||
          '',
        contactphone: this.mainAd.contactphone || '',
        contactemail: user.email || '',
        whatsappnumber: this.mainAd.whatsappnumber || '',

        image_url: '',
        image_urls: [],
        video_url: '',
        video_urls: [],

        category: this.mainAd.category || '',
        subcategory: this.mainAd.subcategory || '',

        location: this.mainAd.full_address,
        address: this.mainAd.full_address,
        latitude: this.mainAd.latitude,
        longitude: this.mainAd.longitude,
        full_address: this.mainAd.full_address,
        place_name: this.mainAd.place_name,
        location_source: this.mainAd.location_source,

        country: this.mainAd.country,
        state: this.mainAd.state,
        district: this.mainAd.district,
        area: this.mainAd.area,

        catalog: this.buildCatalogDraft(),
        custom_fields: {
          country: this.mainAd.country,
          state: this.mainAd.state,
          district: this.mainAd.district,
          area: this.mainAd.area,
          full_address: this.mainAd.full_address,
          latitude: this.mainAd.latitude,
          longitude: this.mainAd.longitude,
          place_name: this.mainAd.place_name
        }
      };

      this.postDraftService.setDraft({
        rawPost: rawPayload,
        mainPhoto: this.mainAd.mainPhoto,
        otherImages: this.mainAd.otherImages,
        videos: this.mainAd.videos,
        serviceBlocks: this.serviceBlocks,
        flowType: 'normal',
        postId: null,
        userId: String(user.id)
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('pending_post_payload', JSON.stringify(rawPayload));
        localStorage.setItem(
          'pending_service_catalog_payload',
          JSON.stringify(this.buildCatalogDraft())
        );
        localStorage.setItem('pending_post_flow', 'normal');
        localStorage.setItem('pending_post_type', this.adType);
        localStorage.setItem('pending_post_userid', String(user.id));
      }

      this.router.navigate(['/subscription-plan'], {
        queryParams: { flow: 'normal' }
      });
    } catch (err) {
      console.error('Error preparing post:', err);
      alert('Error preparing post');
    } finally {
      this.isSubmitting = false;
      this.ngZone.run(() => this.cdr.detectChanges());
    }
  }
}