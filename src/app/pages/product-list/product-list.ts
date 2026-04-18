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
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit {
  posts = signal<any[]>([]);
  displayedPosts = signal<any[]>([]);
  isLoading = signal(false);
  hasMore = signal(true);

  subcategories = signal<SubcategoryItem[]>([]);
  categoriesData: CategoryItem[] = [];

  private page = 0;
  private readonly pageSize = 12;

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
    await this.loadCategories();

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
      this.displayedPosts.set([]);
      this.hasMore.set(true);
      this.subcategories.set([]);
      this.selectedCategoryName = '';

      if (this.selectedCategoryId) {
        const selectedCategory = this.categoriesData.find(
          (c) => Number(c.categoryid) === Number(this.selectedCategoryId)
        );

        this.selectedCategoryName = selectedCategory?.categoryname || '';
        await this.loadSubcategories(this.selectedCategoryId);
      }

      await this.loadMorePosts();
    });
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

  async loadSubcategories(categoryId: number | null): Promise<void> {
    if (!categoryId) {
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

  async onCategoryChange(): Promise<void> {
    this.selectedSubcategoryId = null;

    const selectedCategory = this.categoriesData.find(
      (c) => Number(c.categoryid) === Number(this.selectedCategoryId)
    );

    this.selectedCategoryName = selectedCategory?.categoryname || '';

    await this.loadSubcategories(this.selectedCategoryId);
    this.applyFilters();
  }

  selectSubcategory(sub: SubcategoryItem): void {
    this.selectedSubcategoryId = Number(sub?.subcategoryid || 0) || null;
    this.applyFilters();
  }

  showAllSubcategoryPosts(): void {
    this.selectedSubcategoryId = null;
    this.applyFilters();
  }

  applyFilters(): void {
    let data = [...this.posts()];

    const search = this.searchText.trim().toLowerCase();
    if (search) {
      data = data.filter((post) => {
        const haystack = [
          post?.title,
          post?.description,
          post?.category,
          post?.subcategory,
          post?.location,
          post?.address,
          post?.area,
          post?.city,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(search);
      });
    }

    if (this.selectedCategoryId !== null) {
      data = data.filter(
        (post) =>
          Number(post?.categoryid || 0) === Number(this.selectedCategoryId)
      );
    }

    if (this.selectedSubcategoryId !== null) {
      data = data.filter(
        (post) =>
          Number(post?.subcategoryid || 0) === Number(this.selectedSubcategoryId)
      );
    }

    if (
      this.minPrice !== null &&
      this.minPrice !== undefined &&
      this.minPrice !== 0
    ) {
      data = data.filter(
        (post) => Number(post?.price || 0) >= Number(this.minPrice)
      );
    }

    if (
      this.maxPrice !== null &&
      this.maxPrice !== undefined &&
      this.maxPrice !== 0
    ) {
      data = data.filter(
        (post) => Number(post?.price || 0) <= Number(this.maxPrice)
      );
    }

    if (this.sortBy === 'Newest') {
      data.sort((a, b) => {
        const aTime = new Date(a?.createdon || 0).getTime();
        const bTime = new Date(b?.createdon || 0).getTime();
        return bTime - aTime;
      });
    } else if (this.sortBy === 'Oldest') {
      data.sort((a, b) => {
        const aTime = new Date(a?.createdon || 0).getTime();
        const bTime = new Date(b?.createdon || 0).getTime();
        return aTime - bTime;
      });
    } else if (this.sortBy === 'Price Low to High') {
      data.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
    } else if (this.sortBy === 'Price High to Low') {
      data.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
    }

    this.displayedPosts.set(data);
  }

  resetFilters(): void {
    this.searchText = '';
    this.selectedCategoryId = null;
    this.selectedSubcategoryId = null;
    this.selectedCategoryName = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.sortBy = 'Newest';
    this.subcategories.set([]);

    this.applyFilters();
  }

  async loadMorePosts(): Promise<void> {
    if (this.isLoading() || !this.hasMore()) return;

    this.isLoading.set(true);

    try {
      let newPosts = await this.supabaseService.getProductPosts(
        this.page,
        this.pageSize
      );

      console.log('Loaded products batch:', newPosts);

      if (!newPosts.length || newPosts.length < this.pageSize) {
        this.hasMore.set(false);
      }

      const allPosts = [...this.posts(), ...newPosts];
      this.posts.set(allPosts);

      this.applyFilters();
      this.page++;
    } catch (error) {
      console.error('Error loading products:', error);
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
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.body.offsetHeight - 300;

    if (scrollPosition >= threshold) {
      await this.loadMorePosts();
    }
  }

  getMainImage(post: any): string {
    const fallback = 'assets/no-image.png';

    if (!post?.image_url) return fallback;

    const separator = post.image_url.includes('?') ? '&' : '?';
    return `${post.image_url}${separator}width=320&height=220&resize=cover&quality=70`;
  }

  trackByPostId(index: number, post: any): number {
    return post.postid;
  }
}