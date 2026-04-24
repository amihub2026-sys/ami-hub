import { Component, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-results.html',
  styleUrls: ['./search-results.css']
})
export class SearchResults {
  searchText = '';
  locationText = '';
  selectedRadiusKm = 5;
  selectedType: 'all' | 'product' | 'service' = 'all';

  selectedCategoryId: number | null = null;
  selectedSubcategoryId: number | null = null;

  minPrice: number | null = null;
  maxPrice: number | null = null;

  isLoading = false;

  results: any[] = [];
  filteredResults: any[] = [];

  categories: CategoryItem[] = [];
  subcategories: SubcategoryItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(async (params) => {
      this.searchText = (params['q'] || '').trim();

      const incomingType = String(params['type'] || 'all').toLowerCase().trim();
      this.selectedType =
        incomingType === 'products'
          ? 'product'
          : incomingType === 'services' || incomingType === 'service-list'
          ? 'service'
          : incomingType === 'product' || incomingType === 'service'
          ? (incomingType as 'product' | 'service')
          : 'all';

      this.resetPageState();
      await this.initialLoad();
    });
  }

  resetPageState() {
    this.selectedCategoryId = null;
    this.selectedSubcategoryId = null;
    this.subcategories = [];
    this.results = [];
    this.filteredResults = [];
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async initialLoad() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      await this.loadResults();
      await this.loadCategories();
      await this.resolveCategoryFromSearch();

      if (this.selectedCategoryId !== null) {
        await this.loadResults();
      }

      this.applyFilters();
    } catch (error) {
      console.error('Initial search load error:', error);
      this.results = [];
      this.filteredResults = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  goToServiceList() {
    this.selectedType = 'service';
    this.searchNow();
  }

  async searchNow() {
    const cleanSearch = (this.searchText || '').trim();

    const currentQ = (this.route.snapshot.queryParamMap.get('q') || '').trim();
    const currentType = (this.route.snapshot.queryParamMap.get('type') || 'all').trim();
    const nextType = this.selectedType;

    if (currentQ === cleanSearch && currentType === nextType) {
      this.resetPageState();
      await this.initialLoad();
      return;
    }

    await this.router.navigate(['/search'], {
      queryParams: {
        q: cleanSearch || '',
        type: nextType
      }
    });
  }

  async selectType(type: 'all' | 'product' | 'service') {
    this.selectedType = type;
    await this.searchNow();
  }

  async loadCategories() {
    try {
      let query = supabase
        .from('categories')
        .select('categoryid, categoryname, category_type, isactive, sortorder')
        .eq('isactive', true)
        .order('sortorder', { ascending: true });

      if (this.selectedType === 'product') {
        query = query.eq('category_type', 'product');
      }

      const { data, error } = await query;
      if (error) throw error;

      this.categories = (data || []) as CategoryItem[];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categories = [];
      this.cdr.detectChanges();
    }
  }

  async loadSubcategories(categoryId: number | null) {
    if (!categoryId) {
      this.subcategories = [];
      this.cdr.detectChanges();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('subcategoryid, categoryid, subcategoryname, iconurl, isactive, sortorder')
        .eq('categoryid', categoryId)
        .eq('isactive', true)
        .order('sortorder', { ascending: true });

      if (error) throw error;

      this.subcategories = (data || []) as SubcategoryItem[];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading subcategories:', error);
      this.subcategories = [];
      this.cdr.detectChanges();
    }
  }

  async resolveCategoryFromSearch() {
    const cleanSearch = (this.searchText || '').trim().toLowerCase();

    this.selectedCategoryId = null;
    this.selectedSubcategoryId = null;
    this.subcategories = [];

    if (!cleanSearch || this.categories.length === 0) {
      this.cdr.detectChanges();
      return;
    }

    const matchedCategory = this.findCategoryFromSearch(cleanSearch);

    if (matchedCategory) {
      const detectedId = Number(matchedCategory.categoryid);
      const exists = this.categories.find(
        (c) => Number(c.categoryid) === detectedId
      );

      if (exists) {
        this.selectedCategoryId = detectedId;
        await this.loadSubcategories(this.selectedCategoryId);

        setTimeout(() => {
          this.selectedCategoryId = detectedId;
          this.cdr.detectChanges();
        });
      }

      this.cdr.detectChanges();
      return;
    }

    const matchedPost = this.results.find((item: any) => {
      const text = [
        item?.title,
        item?.description,
        item?.category,
        item?.displayTitle,
        item?.displayLocation
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const normalizedSearch = this.normalizeWord(cleanSearch);

      return (
        text.includes(cleanSearch) ||
        text.includes(normalizedSearch) ||
        this.normalizeWord(text).includes(normalizedSearch)
      );
    });

    if (matchedPost?.categoryid) {
      const detectedId = Number(matchedPost.categoryid);
      const exists = this.categories.find(
        (c) => Number(c.categoryid) === detectedId
      );

      if (exists) {
        this.selectedCategoryId = detectedId;
        await this.loadSubcategories(this.selectedCategoryId);

        setTimeout(() => {
          this.selectedCategoryId = detectedId;
          this.cdr.detectChanges();
        });
      }
    }

    this.cdr.detectChanges();
  }

  async onCategoryChange() {
    this.selectedSubcategoryId = null;
    await this.loadSubcategories(this.selectedCategoryId);
    this.applyFilters();
  }

  selectSubcategory(sub: SubcategoryItem) {
    this.selectedSubcategoryId = sub.subcategoryid;
    this.applyFilters();
  }

  showAllSubcategoryPosts() {
    this.selectedSubcategoryId = null;
    this.applyFilters();
  }

  async loadResults() {
    try {
      let query = supabase
        .from('post')
        .select(`
          postid,
          title,
          description,
          price,
          location,
          areaid,
          cityid,
          image_url,
          image_urls,
          category,
          categoryid,
          subcategoryid,
          adtype,
          isactive,
          status,
          createdon
        `)
        .eq('isactive', true)
        .eq('status', 'Active')
        .order('createdon', { ascending: false })
        .limit(60);

      if (this.selectedType === 'product') {
        query = query.eq('adtype', 'product');
      } else if (this.selectedType === 'service') {
        query = query.eq('adtype', 'service');
      }

      if (this.selectedCategoryId !== null) {
        query = query.eq('categoryid', this.selectedCategoryId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        ...item,
        mainImage: this.getMainImage(item),
        displayTitle: item.title || 'Untitled',
        displayPrice: Number(item.price || 0),
        displayLocation: item.location || this.buildLocation(item),
        displayType: (item.adtype || 'product').toLowerCase()
      }));

      this.results = mapped;
      this.filteredResults = [...mapped];
      this.isLoading = false;

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading results:', error);
      this.results = [];
      this.filteredResults = [];
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  findCategoryFromSearch(cleanSearch: string): CategoryItem | null {
    const search = cleanSearch.trim().toLowerCase();

    for (const category of this.categories) {
      const name = String(category.categoryname || '').trim().toLowerCase();
      if (!name) continue;

      if (search === name) return category;
      if (search.includes(name) || name.includes(search)) return category;
      if (this.normalizeWord(search) === this.normalizeWord(name)) return category;

      const searchWords = search.split(/\s+/).filter(Boolean);
      const categoryWords = name.split(/\s+/).filter(Boolean);

      for (const sWord of searchWords) {
        if (sWord.length < 3) continue;

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

  normalizeWord(value: string): string {
    let v = value.trim().toLowerCase();

    if (v.endsWith('ies')) return v.slice(0, -3) + 'y';
    if (v.endsWith('es')) return v.slice(0, -2);
    if (v.endsWith('s')) return v.slice(0, -1);

    return v;
  }

  applyFilters() {
    const cleanSearch = (this.searchText || '').trim().toLowerCase();
    const locationSearch = (this.locationText || '').trim().toLowerCase();
    let data = [...this.results];

    if (cleanSearch) {
      data = data.filter((item) =>
        String(item.title || '').toLowerCase().includes(cleanSearch) ||
        String(item.description || '').toLowerCase().includes(cleanSearch) ||
        String(item.category || '').toLowerCase().includes(cleanSearch)
      );
    }

    if (locationSearch) {
      data = data.filter((item) => {
        const locationHaystack = [
          item?.location,
          item?.displayLocation
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return locationHaystack.includes(locationSearch);
      });
    }

    if (this.selectedCategoryId !== null) {
      data = data.filter((item) =>
        Number(item.categoryid) === Number(this.selectedCategoryId)
      );
    }

    if (this.selectedSubcategoryId !== null) {
      data = data.filter((item) =>
        Number(item.subcategoryid) === Number(this.selectedSubcategoryId)
      );
    }

    if (this.minPrice !== null && this.minPrice !== 0) {
      data = data.filter((item) =>
        Number(item.displayPrice || 0) >= Number(this.minPrice)
      );
    }

    if (this.maxPrice !== null && this.maxPrice !== 0) {
      data = data.filter((item) =>
        Number(item.displayPrice || 0) <= Number(this.maxPrice)
      );
    }

    this.filteredResults = data;
    this.cdr.detectChanges();
  }

  async resetFilters() {
    this.searchText = '';
    this.locationText = '';
    this.selectedRadiusKm = 5;
    this.selectedCategoryId = null;
    this.selectedSubcategoryId = null;
    this.subcategories = [];
    this.minPrice = null;
    this.maxPrice = null;
    this.results = [];
    this.filteredResults = [];
    this.isLoading = false;
    this.cdr.detectChanges();

    await this.initialLoad();
  }

  buildLocation(item: any): string {
    if (item?.location) return item.location;

    const parts: string[] = [];
    if (item?.areaid) parts.push(`Area ${item.areaid}`);
    if (item?.cityid) parts.push(`City ${item.cityid}`);

    return parts.length ? parts.join(', ') : 'Location not available';
  }

  getMainImage(item: any): string {
    if (item?.image_url) return item.image_url;
    if (Array.isArray(item?.image_urls) && item.image_urls.length > 0) {
      return item.image_urls[0];
    }
    return 'https://via.placeholder.com/400x260?text=No+Image';
  }

  openDetails(item: any) {
    const id = item?.postid;
    if (!id) return;
    this.router.navigate(['/details', id]);
  }
}