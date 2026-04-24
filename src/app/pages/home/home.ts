import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  signal,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class Home implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  goToAllCategories() {
    this.router.navigate(['/all-categories']);
  }

  goToProducts() {
    this.router.navigate(['/products']);
  }

  goToServices() {
    this.router.navigate(['/service-list']);
  }

  goToSubscriptionPlan() {
    this.router.navigateByUrl('/subscription-plan');
  }

  currentSlide = 0;
  totalSlides = 3;
  autoSlideInterval: any;
  slidesArray = Array(this.totalSlides);

  customersCount = 0;
  productsCount = 0;
  servicesCount = 0;
  sellersCount = 0;

  animatedCustomersCount = 0;
  animatedProductsCount = 0;
  animatedServicesCount = 0;
  animatedSellersCount = 0;

  counterInterval: any;

  readonly targetCustomersCount = 1500;
  readonly targetProductsCount = 910;
  readonly targetServicesCount = 650;
  readonly targetSellersCount = 500;

  activeTab: string = 'all';
  searchQuery: string = '';
  recognition: any;

  trendingPosts = signal<any[]>([]);
  isTrendingLoading = signal(false);

  browseCategories = signal<any[]>([]);
  productCategories = signal<any[]>([]);
  serviceCategories = signal<any[]>([]);
  isCategoriesLoading = signal(false);

  featuredBusinesses = signal<any[]>([]);
  isFeaturedLoading = signal(false);

  latestProducts = signal<any[]>([]);
  isLatestLoading = signal(false);

  trendingOffset = signal(0);
  private trendingInterval: any;
  readonly visibleTrendingCount = 5;

  async ngOnInit() {
    this.startAutoSlide();

    await this.loadBrowseCategories();
    await this.loadFeaturedBusinesses();
    await this.loadTrendingPosts();
    await this.loadNewProducts();

    this.startTrendingAutoScroll();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.cdr.detectChanges();
      this.startCounter();
    }, 100);
  }

  async loadBrowseCategories() {
    this.isCategoriesLoading.set(true);

    try {
      const data = await this.supabaseService.getAllBrowseCategories();
      const allCategories = (data || []).filter((item: any) => item?.isactive === true);

      this.browseCategories.set(allCategories);
      this.productCategories.set(
        allCategories.filter((item: any) => item?.category_type === 'product')
      );
      this.serviceCategories.set(
        allCategories.filter((item: any) => item?.category_type === 'service')
      );
    } catch (error) {
      console.error('Error loading browse categories:', error);
      this.browseCategories.set([]);
      this.productCategories.set([]);
      this.serviceCategories.set([]);
    } finally {
      this.isCategoriesLoading.set(false);
    }
  }

  async loadTrendingPosts() {
    this.isTrendingLoading.set(true);

    try {
      const data = await this.supabaseService.getPosts(0, 10);
      this.trendingPosts.set(data || []);
    } catch (error) {
      console.error('Error loading trending posts:', error);
      this.trendingPosts.set([]);
    } finally {
      this.isTrendingLoading.set(false);
    }
  }

  async loadFeaturedBusinesses() {
    this.isFeaturedLoading.set(true);

    try {
      const data = await this.supabaseService.getFeaturedPosts(0, 8);
      this.featuredBusinesses.set(data || []);
    } catch (error) {
      console.error('Error loading featured businesses:', error);
      this.featuredBusinesses.set([]);
    } finally {
      this.isFeaturedLoading.set(false);
    }
  }

  async loadNewProducts() {
    this.isLatestLoading.set(true);

    try {
      const data = await this.supabaseService.getPosts(0, 12);

      const featuredIds = new Set(
        (this.featuredBusinesses() || []).map((item: any) =>
          (item?.postid ?? item?.id ?? '').toString()
        )
      );

      const hotIds = new Set(
        (this.trendingPosts() || []).map((item: any) =>
          (item?.postid ?? item?.id ?? '').toString()
        )
      );

      const filtered = (data || []).filter((item: any) => {
        const id = (item?.postid ?? item?.id ?? '').toString();
        return !featuredIds.has(id) && !hotIds.has(id);
      });

      this.latestProducts.set(filtered);
    } catch (error) {
      console.error('Error loading latest products:', error);
      this.latestProducts.set([]);
    } finally {
      this.isLatestLoading.set(false);
    }
  }

  getCategoryImage(category: any): string {
    return (
      category?.iconurl ||
      category?.image_url ||
      'assets/icons/default.png'
    );
  }

  getFeaturedImage(post: any): string {
    const fallback = 'assets/ads/shop1.jpg';
    if (!post?.image_url) return fallback;
    const separator = post.image_url.includes('?') ? '&' : '?';
    return `${post.image_url}${separator}width=320&height=220&resize=cover&quality=70`;
  }

  getVisibleTrendingPosts() {
    const posts = this.trendingPosts();
    if (!posts.length) return [];

    if (posts.length <= this.visibleTrendingCount) return posts;

    const start = this.trendingOffset();
    const result = [];

    for (let i = 0; i < this.visibleTrendingCount; i++) {
      result.push(posts[(start + i) % posts.length]);
    }

    return result;
  }

  startTrendingAutoScroll() {
    this.stopTrendingAutoScroll();

    this.trendingInterval = setInterval(() => {
      const posts = this.trendingPosts();
      if (posts.length <= this.visibleTrendingCount) return;

      this.trendingOffset.update(value => (value + 1) % posts.length);
    }, 2500);
  }

  stopTrendingAutoScroll() {
    if (this.trendingInterval) {
      clearInterval(this.trendingInterval);
      this.trendingInterval = null;
    }
  }

  getTrendingImage(post: any): string {
    const fallback = 'assets/ads/shop1.jpg';
    if (!post?.image_url) return fallback;
    const separator = post.image_url.includes('?') ? '&' : '?';
    return `${post.image_url}${separator}width=320&height=220&resize=cover&quality=70`;
  }

  getLatestProductImage(post: any): string {
    const fallback = 'assets/ads/shop1.jpg';

    if (post?.image_url) {
      const separator = post.image_url.includes('?') ? '&' : '?';
      return `${post.image_url}${separator}width=320&height=220&resize=cover&quality=70`;
    }

    if (Array.isArray(post?.image_urls) && post.image_urls.length > 0) {
      const firstImage = post.image_urls[0];
      if (firstImage) {
        const separator = firstImage.includes('?') ? '&' : '?';
        return `${firstImage}${separator}width=320&height=220&resize=cover&quality=70`;
      }
    }

    return fallback;
  }

  openDetails(post: any) {
    if (!post?.postid) return;
    this.router.navigate(['/details', post.postid]);
  }

  toggleFavourite(item: any, event: Event) {
    event.stopPropagation();
    
  }

  openCategory(category: any) {
    const type = category?.category_type || '';

    if (type === 'service') {
      this.router.navigate(['/service-list'], {
        queryParams: { category: category.categoryid }
      });
      return;
    }

    if (type === 'product') {
      this.router.navigate(['/products'], {
        queryParams: { category: category.categoryid }
      });
      return;
    }

    this.router.navigate(['/search'], {
      queryParams: { category: category.categoryid, type: 'all' }
    });
  }

  openProductCategory(category: any) {
    this.router.navigate(['/products'], {
      queryParams: { category: category.categoryid }
    });
  }

  openServiceCategory(category: any) {
    this.router.navigate(['/service-list'], {
      queryParams: { category: category.categoryid }
    });
  }

  startAutoSlide() {
    this.autoSlideInterval = setInterval(() => this.nextSlide(), 3000);
  }

  pauseSlider() {
    clearInterval(this.autoSlideInterval);
  }

  resumeSlider() {
    this.startAutoSlide();
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
  }

  startCounter() {
    clearInterval(this.counterInterval);

    this.animatedCustomersCount = 1;
    this.animatedProductsCount = 1;
    this.animatedServicesCount = 1;
    this.animatedSellersCount = 1;

    this.customersCount = 1;
    this.productsCount = 1;
    this.servicesCount = 1;
    this.sellersCount = 1;

    this.cdr.detectChanges();

    this.ngZone.runOutsideAngular(() => {
      this.counterInterval = setInterval(() => {
        let changed = false;

        if (this.animatedCustomersCount < this.targetCustomersCount) {
          this.animatedCustomersCount++;
          changed = true;
        }

        if (this.animatedProductsCount < this.targetProductsCount) {
          this.animatedProductsCount++;
          changed = true;
        }

        if (this.animatedServicesCount < this.targetServicesCount) {
          this.animatedServicesCount++;
          changed = true;
        }

        if (this.animatedSellersCount < this.targetSellersCount) {
          this.animatedSellersCount++;
          changed = true;
        }

        this.customersCount = this.animatedCustomersCount;
        this.productsCount = this.animatedProductsCount;
        this.servicesCount = this.animatedServicesCount;
        this.sellersCount = this.animatedSellersCount;

        if (changed) {
          this.ngZone.run(() => {
            this.cdr.detectChanges();
          });
        }

        if (
          this.animatedCustomersCount >= this.targetCustomersCount &&
          this.animatedProductsCount >= this.targetProductsCount &&
          this.animatedServicesCount >= this.targetServicesCount &&
          this.animatedSellersCount >= this.targetSellersCount
        ) {
          clearInterval(this.counterInterval);
        }
      }, 30);
    });
  }

  selectTab(tab: string) {
    this.activeTab = tab;
    // this.searchQuery = '';

    if (tab === 'service-list') {
      this.router.navigate(['/service-list']);
      return;
    }

    if (tab === 'products') {
      this.router.navigate(['/products']);
      return;
    }

    this.router.navigate(['/search'], {
      queryParams: { type: 'all' }
    });
  }

goToPage() {
  const query = this.searchQuery?.trim() || '';

  this.router.navigate(['/search'], {
    queryParams: {
      q: query,
      type:
        this.activeTab === 'products'
          ? 'product'
          : this.activeTab === 'service-list'
          ? 'service'
          : 'all'
    }
  });
}

  goToAllProductCategories() {
    this.router.navigate(['/product-categories']);
  }

  goToAllDeals() {
    this.router.navigate(['/all-listings']);
  }

  goToAllServiceCategories() {
    this.router.navigate(['/service-categories']);
  }

  getSearchPlaceholder() {
    if (this.activeTab === 'products') {
      return 'Search products like cars, mobiles, furniture...';
    }

    if (this.activeTab === 'services' || this.activeTab === 'service-list') {
      return 'Search services like plumbing, electrician, tutors...';
    }

    return 'Search products and services...';
  }

  startVoiceSearch() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Your browser does not support voice search.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.start();

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.searchQuery = transcript;
      this.goToPage();
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
    };
  }

  ngOnDestroy() {
    clearInterval(this.autoSlideInterval);
    clearInterval(this.counterInterval);
    this.stopTrendingAutoScroll();
  }
}