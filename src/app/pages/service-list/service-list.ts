import { Component, OnInit, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { supabase } from '../../../supabaseClient';

interface CategoryItem {
  categoryid: number;
  categoryname: string;
  category_type?: string | null;
  isactive?: boolean | null;
  sortorder?: number | null;
}

interface SubcategoryItem {
  subcategoryid: number;
  categoryid: number;
  subcategoryname: string;
  iconurl?: string | null;
  isactive?: boolean | null;
  sortorder?: number | null;
}

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './service-list.html',
  styleUrl: './service-list.css',
})
export class ServiceList implements OnInit {
  posts = signal<any[]>([]);
  filteredPosts = signal<any[]>([]);
  isLoading = signal(false);
  hasMore = signal(true);

  subcategories = signal<SubcategoryItem[]>([]);
  categoriesData: CategoryItem[] = [];
  allSubcategories: SubcategoryItem[] = [];

  private page = 0;
  private readonly pageSize = 12;

  private selectedLocation: any = null;
  selectedRadiusKm = 5;
  locationText = '';

  searchText = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  sortBy = 'Newest';

  selectedCategoryId: number | null = null;
  selectedSubcategoryId: number | null = null;
  selectedCategoryName = '';

  constructor(
    private supabaseService: SupabaseService,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadSelectedLocationAndRadius();
    await this.loadCategories();
    await this.loadAllSubcategories();

    this.route.queryParams.subscribe(async (params) => {
      this.selectedCategoryId = params['category']
        ? Number(params['category'])
        : null;

      this.selectedSubcategoryId = params['subcategory']
        ? Number(params['subcategory'])
        : null;

      this.searchText = (params['q'] || '').toString().trim();

      this.page = 0;
      this.posts.set([]);
      this.filteredPosts.set([]);
      this.hasMore.set(true);
      this.subcategories.set([]);
      this.selectedCategoryName = '';

      if (this.selectedCategoryId !== null) {
        const selectedCategory = this.categoriesData.find(
          (c) => Number(c.categoryid) === Number(this.selectedCategoryId)
        );

        this.selectedCategoryName = selectedCategory?.categoryname || '';
        await this.loadSubcategories(this.selectedCategoryId);
      } else if (this.searchText) {
        await this.syncSearchWithCategoryAndSubcategory();
      }

      await this.loadMore();
      this.applyFilters();
    });
  }

  private loadSelectedLocationAndRadius(): void {
    if (typeof window === 'undefined') return;

    const savedRadius = localStorage.getItem('selectedRadiusKm');
    if (savedRadius && !isNaN(Number(savedRadius))) {
      this.selectedRadiusKm = Number(savedRadius);
    }

    const savedLocation = localStorage.getItem('amh_selected_location');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        this.selectedLocation = {
          ...parsed,
          lat: parsed?.lat != null ? Number(parsed.lat) : null,
          lon: parsed?.lon != null ? Number(parsed.lon) : null,
        };

        this.locationText =
          parsed?.name ||
          parsed?.address ||
          parsed?.place_name ||
          parsed?.city ||
          '';
      } catch (error) {
        console.error('Failed to parse selected location:', error);
        this.selectedLocation = null;
      }
    }
  }

  async loadCategories(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('categoryid, categoryname, category_type, isactive, sortorder')
        .eq('isactive', true)
        .order('sortorder', { ascending: true });

      if (error) {
        console.error('Error loading categories:', error);
        this.categoriesData = [];
        return;
      }

      this.categoriesData = (data || []) as CategoryItem[];
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categoriesData = [];
    }
  }

  async loadAllSubcategories(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select(
          'subcategoryid, categoryid, subcategoryname, iconurl, isactive, sortorder'
        )
        .eq('isactive', true)
        .order('sortorder', { ascending: true });

      if (error) {
        console.error('Error loading all subcategories:', error);
        this.allSubcategories = [];
        return;
      }

      this.allSubcategories = (data || []) as SubcategoryItem[];
    } catch (error) {
      console.error('Error loading all subcategories:', error);
      this.allSubcategories = [];
    }
  }

  async loadSubcategories(categoryId: number | null): Promise<void> {
    if (categoryId === null) {
      this.subcategories.set([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select(
          'subcategoryid, categoryid, subcategoryname, iconurl, isactive, sortorder'
        )
        .eq('categoryid', categoryId)
        .eq('isactive', true)
        .order('sortorder', { ascending: true });

      if (error) {
        console.error('Error loading subcategories:', error);
        this.subcategories.set([]);
        return;
      }

      this.subcategories.set((data || []) as SubcategoryItem[]);
    } catch (error) {
      console.error('Error loading subcategories:', error);
      this.subcategories.set([]);
    }
  }

  async onSearchTextChange(): Promise<void> {
    await this.syncSearchWithCategoryAndSubcategory();
    this.applyFilters();
  }

  onLocationInputChange(): void {
    const typedValue = this.locationText.trim().toLowerCase();

    const savedLocationText = (
      this.selectedLocation?.name ||
      this.selectedLocation?.address ||
      this.selectedLocation?.place_name ||
      this.selectedLocation?.city ||
      ''
    )
      .toString()
      .trim()
      .toLowerCase();

    if (!typedValue) {
      this.applyFilters();
      return;
    }

    if (savedLocationText && typedValue !== savedLocationText) {
      this.selectedLocation = null;
    }

    this.applyFilters();
  }

  async syncSearchWithCategoryAndSubcategory(): Promise<void> {
    const keyword = this.searchText.trim().toLowerCase();

    if (!keyword) {
      this.selectedCategoryId = null;
      this.selectedSubcategoryId = null;
      this.selectedCategoryName = '';
      this.subcategories.set([]);
      return;
    }

    const matchedCategory = this.findCategoryFromSearch(keyword);

    if (matchedCategory) {
      this.selectedCategoryId = Number(matchedCategory.categoryid);
      this.selectedSubcategoryId = null;
      this.selectedCategoryName = matchedCategory.categoryname || '';
      await this.loadSubcategories(this.selectedCategoryId);
      return;
    }

    const matchedSubcategory = this.allSubcategories.find((s) => {
      const subName = (s.subcategoryname || '').toString().trim().toLowerCase();
      return subName === keyword || subName.includes(keyword) || keyword.includes(subName);
    });

    if (matchedSubcategory) {
      this.selectedCategoryId = Number(matchedSubcategory.categoryid);
      this.selectedSubcategoryId = Number(matchedSubcategory.subcategoryid);

      const selectedCategory = this.categoriesData.find(
        (c) => Number(c.categoryid) === Number(matchedSubcategory.categoryid)
      );

      this.selectedCategoryName = selectedCategory?.categoryname || '';
      await this.loadSubcategories(this.selectedCategoryId);
      return;
    }

    const matchedPost = this.posts().find((p: any) => {
      const text = [
        p?.title,
        p?.description,
        p?.category,
        p?.subcategory,
        p?.categoryname,
        p?.subcategoryname
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(keyword);
    });

    if (matchedPost) {
      const matchedCategoryName = (
        matchedPost?.category ??
        matchedPost?.categoryname ??
        ''
      )
        .toString()
        .trim()
        .toLowerCase();

      const matchedSubcategoryName = (
        matchedPost?.subcategory ??
        matchedPost?.subcategoryname ??
        ''
      )
        .toString()
        .trim()
        .toLowerCase();

      const matchedCategoryFromPost = this.categoriesData.find((c) => {
        const name = (c.categoryname || '').toString().trim().toLowerCase();
        return name === matchedCategoryName;
      });

      if (matchedCategoryFromPost) {
        this.selectedCategoryId = Number(matchedCategoryFromPost.categoryid);
        this.selectedCategoryName = matchedCategoryFromPost.categoryname || '';
        await this.loadSubcategories(this.selectedCategoryId);

        const matchedSubcategoryFromPost = this.subcategories().find((s) => {
          const name = (s.subcategoryname || '').toString().trim().toLowerCase();
          return name === matchedSubcategoryName;
        });

        this.selectedSubcategoryId = matchedSubcategoryFromPost
          ? Number(matchedSubcategoryFromPost.subcategoryid)
          : null;
      }
    }
  }

  async onCategoryChange(): Promise<void> {
    this.selectedSubcategoryId = null;

    const selectedCategory = this.categoriesData.find(
      (c) => Number(c.categoryid) === Number(this.selectedCategoryId)
    );

    this.selectedCategoryName = selectedCategory?.categoryname || '';
    this.searchText = selectedCategory?.categoryname || '';

    await this.loadSubcategories(this.selectedCategoryId);
    this.applyFilters();
  }

  selectSubcategory(sub: SubcategoryItem): void {
    this.selectedSubcategoryId = Number(sub?.subcategoryid || 0) || null;
    this.searchText = sub.subcategoryname || '';
    this.applyFilters();
  }

  showAllSubcategoryPosts(): void {
    this.selectedSubcategoryId = null;

    const selectedCategory = this.categoriesData.find(
      (c) => Number(c.categoryid) === Number(this.selectedCategoryId)
    );

    this.searchText = selectedCategory?.categoryname || '';
    this.applyFilters();
  }

  private findCategoryFromSearch(searchValue: string): CategoryItem | null {
    const search = String(searchValue || '').trim().toLowerCase();
    if (!search) return null;

    for (const category of this.categoriesData) {
      const name = String(category.categoryname || '').trim().toLowerCase();
      if (!name) continue;

      if (search === name) return category;
      if (search.includes(name) || name.includes(search)) return category;
      if (this.normalizeWord(search) === this.normalizeWord(name)) return category;

      const searchWords = search.split(/\s+/).filter(Boolean);
      const categoryWords = name.split(/\s+/).filter(Boolean);

      for (const sWord of searchWords) {
        if (sWord.length < 2) continue;

        const matched = categoryWords.some((cWord) =>
          cWord.includes(sWord) ||
          sWord.includes(cWord) ||
          this.normalizeWord(cWord) === this.normalizeWord(sWord)
        );

        if (matched) return category;
      }
    }

    return null;
  }

  private normalizeWord(value: string): string {
    let v = String(value || '').trim().toLowerCase();

    if (v.endsWith('ies')) return v.slice(0, -3) + 'y';
    if (v.endsWith('es')) return v.slice(0, -2);
    if (v.endsWith('s')) return v.slice(0, -1);

    return v;
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

  private processPostsByRadius(posts: any[]): any[] {
    if (!this.hasValidCoordinates(this.selectedLocation)) {
      return posts.map((post: any) => ({
        ...post,
        distanceKm: null,
      }));
    }

    const originLat = Number(this.selectedLocation.lat);
    const originLon = Number(this.selectedLocation.lon);

    return posts.map((post: any) => {
      const postLat =
        post?.latitude != null
          ? Number(post.latitude)
          : post?.lat != null
          ? Number(post.lat)
          : null;

      const postLon =
        post?.longitude != null
          ? Number(post.longitude)
          : post?.lon != null
          ? Number(post.lon)
          : null;

      const hasPostCoords =
        postLat != null &&
        postLon != null &&
        !isNaN(postLat) &&
        !isNaN(postLon);

      if (!hasPostCoords) {
        return {
          ...post,
          distanceKm: null,
        };
      }

      const distanceKm = this.calculateDistanceKm(
        originLat,
        originLon,
        postLat,
        postLon
      );

      return {
        ...post,
        distanceKm: Number(distanceKm.toFixed(1)),
      };
    });
  }

  applyFilters(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedRadiusKm', String(this.selectedRadiusKm));
    }

    let data = [...this.posts()];

    const search = this.searchText.trim().toLowerCase();
    const locationSearch = this.locationText.trim().toLowerCase();

    const selectedCategory = this.categoriesData.find(
      (c) => Number(c.categoryid) === Number(this.selectedCategoryId)
    );
    const selectedCategoryName = (
      selectedCategory?.categoryname || ''
    ).toLowerCase();

    const selectedSubcategory = this.subcategories().find(
      (s) => Number(s.subcategoryid) === Number(this.selectedSubcategoryId)
    );
    const selectedSubcategoryName = (
      selectedSubcategory?.subcategoryname || ''
    ).toLowerCase();

    if (search) {
      data = data.filter((post: any) => {
        const haystack = [
          post?.title,
          post?.description,
          post?.category,
          post?.categoryname,
          post?.subcategory,
          post?.subcategoryname,
          post?.location,
          post?.address,
          post?.area,
          post?.city,
          this.selectedCategoryName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(search);
      });
    }

    if (locationSearch) {
      data = data.filter((post: any) => {
        const locationHaystack = [
          post?.location,
          post?.address,
          post?.area,
          post?.city,
          post?.full_address,
          post?.place_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return locationHaystack.includes(locationSearch);
      });
    }

    if (
      this.hasValidCoordinates(this.selectedLocation) &&
      this.selectedRadiusKm > 0 &&
      !locationSearch
    ) {
      data = data.filter((post: any) => {
        const postLat =
          post?.latitude != null
            ? Number(post.latitude)
            : post?.lat != null
            ? Number(post.lat)
            : null;

        const postLon =
          post?.longitude != null
            ? Number(post.longitude)
            : post?.lon != null
            ? Number(post.lon)
            : null;

        const hasPostCoords =
          postLat != null &&
          postLon != null &&
          !isNaN(postLat) &&
          !isNaN(postLon);

        if (!hasPostCoords) return false;

        const distanceKm = this.calculateDistanceKm(
          Number(this.selectedLocation.lat),
          Number(this.selectedLocation.lon),
          postLat,
          postLon
        );

        return distanceKm <= this.selectedRadiusKm;
      });
    }

    if (this.selectedCategoryId !== null) {
      data = data.filter((post: any) => {
        const postCategoryId = Number(
          post?.categoryid ?? post?.category_id ?? 0
        );

        const postCategoryName = (
          post?.category ??
          post?.categoryname ??
          ''
        )
          .toString()
          .trim()
          .toLowerCase();

        return (
          postCategoryId === Number(this.selectedCategoryId) ||
          postCategoryName === selectedCategoryName
        );
      });
    }

    if (this.selectedSubcategoryId !== null) {
      data = data.filter((post: any) => {
        const postSubcategoryId = Number(
          post?.subcategoryid ?? post?.subcategory_id ?? 0
        );

        const postSubcategoryName = (
          post?.subcategory ??
          post?.subcategoryname ??
          ''
        )
          .toString()
          .trim()
          .toLowerCase();

        return (
          postSubcategoryId === Number(this.selectedSubcategoryId) ||
          postSubcategoryName === selectedSubcategoryName
        );
      });
    }

    if (
      this.minPrice !== null &&
      this.minPrice !== undefined &&
      this.minPrice !== 0
    ) {
      data = data.filter(
        (post: any) => Number(post?.price || 0) >= Number(this.minPrice)
      );
    }

    if (
      this.maxPrice !== null &&
      this.maxPrice !== undefined &&
      this.maxPrice !== 0
    ) {
      data = data.filter(
        (post: any) => Number(post?.price || 0) <= Number(this.maxPrice)
      );
    }

    if (this.sortBy === 'Newest') {
      data.sort((a: any, b: any) => {
        const aTime = new Date(a?.createdon || 0).getTime();
        const bTime = new Date(b?.createdon || 0).getTime();
        return bTime - aTime;
      });
    } else if (this.sortBy === 'Oldest') {
      data.sort((a: any, b: any) => {
        const aTime = new Date(a?.createdon || 0).getTime();
        const bTime = new Date(b?.createdon || 0).getTime();
        return aTime - bTime;
      });
    } else if (this.sortBy === 'Price Low') {
      data.sort(
        (a: any, b: any) => Number(a?.price || 0) - Number(b?.price || 0)
      );
    } else if (this.sortBy === 'Price High') {
      data.sort(
        (a: any, b: any) => Number(b?.price || 0) - Number(a?.price || 0)
      );
    }

    this.filteredPosts.set(data);
  }

  resetFilters(): void {
    this.searchText = '';
    this.locationText = this.selectedLocation?.name ||
      this.selectedLocation?.address ||
      this.selectedLocation?.place_name ||
      this.selectedLocation?.city ||
      '';
    this.selectedCategoryId = null;
    this.selectedSubcategoryId = null;
    this.selectedCategoryName = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.sortBy = 'Newest';
    this.selectedRadiusKm = 5;
    this.subcategories.set([]);

    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedRadiusKm', String(this.selectedRadiusKm));
    }

    this.applyFilters();
  }

  async loadMore(): Promise<void> {
    if (this.isLoading() || !this.hasMore()) return;

    this.isLoading.set(true);

    try {
      const data: any[] = await this.supabaseService.getServicePosts(
        this.page,
        this.pageSize
      );

      const normalizedData = (data || []).map((post: any) => ({
        ...post,
        categoryid: post?.categoryid ?? post?.category_id ?? null,
        subcategoryid: post?.subcategoryid ?? post?.subcategory_id ?? null,
        categoryname: post?.categoryname ?? post?.category ?? '',
        subcategoryname: post?.subcategoryname ?? post?.subcategory ?? '',
      }));

      if (!normalizedData.length || normalizedData.length < this.pageSize) {
        this.hasMore.set(false);
      }

      const processedData = this.processPostsByRadius(normalizedData);
      const allPosts = [...this.posts(), ...processedData];

      this.posts.set(allPosts);
      this.applyFilters();
      this.page++;
    } catch (e) {
      console.error('Error loading service posts:', e);
      this.hasMore.set(false);
    } finally {
      this.isLoading.set(false);
    }
  }

  getShortLocation(post: any): string {
    const location =
      post?.location || post?.address || post?.area || post?.city || '';

    if (!location) return '';

    const parts = location
      .split(',')
      .map((p: string) => p.trim())
      .filter(Boolean);

    return parts.slice(0, 2).join(', ');
  }

  @HostListener('window:scroll')
  async onScroll(): Promise<void> {
    const scroll = window.innerHeight + window.scrollY;
    const height = document.body.offsetHeight - 300;

    if (scroll >= height) {
      await this.loadMore();
    }
  }

  getImage(post: any): string {
    const fallback = 'assets/no-image.png';

    if (!post?.image_url) return fallback;

    const separator = post.image_url.includes('?') ? '&' : '?';
    return `${post.image_url}${separator}width=320&height=220&resize=cover&quality=70`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/no-image.png';
  }

  trackByPostId(index: number, post: any): number {
    return post.postid;
  }
}