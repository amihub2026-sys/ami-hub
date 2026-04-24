import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SupabaseService } from '../../services/supabase.service';
import { supabase } from '../../../supabaseClient';

@Component({
  selector: 'app-post-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './post-view.html',
  styleUrls: ['./post-view.css']
})
export class PostViewComponent implements OnInit {
  toggleReviewForm() {
    const next = !this.showReviewForm();
    this.showReviewForm.set(next);

    if (next) {
      this.selectedRating = 0;
      this.hoverRating = 0;
      this.reviewText = '';
      this.reviewImages = [];
      this.reviewVideo = null;
    }
  }

  toggleReportForm() {
    this.showReportForm.set(!this.showReportForm());
  }

  submitReport() {
    if (!this.reportText.trim()) {
      alert('Please enter report message');
      return;
    }

    const post = this.postData();

    if (!post?.postid) {
      alert('Post not found');
      return;
    }



    alert('Report submitted successfully!');

    this.reportText = '';
    this.showReportForm.set(false);
  }

  selectedRating = 0;
  hoverRating = 0;
  averageRating = signal(0);
  reviews = signal<any[]>([]);
  isReviewSubmitting = signal(false);
  isReviewsLoading = signal(false);

  postId = '';
  postData = signal<any | null>(null);
  isLoading = signal(false);

  selectedMedia = signal<{ type: 'image' | 'video'; url: string }>({
    type: 'image',
    url: ''
  });

  showReviewForm = signal(false);
  reviewText = '';
  reviewImages: string[] = [];
  reviewVideo: string | null = null;

  showReportForm = signal(false);
  reportText = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService,
    private sanitizer: DomSanitizer
  ) {}

  async ngOnInit(): Promise<void> {
    this.postId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.postId) {
      console.error('Post id not found in route');
      return;
    }

    await this.loadPost();
  }

  setRating(star: number) {
    this.selectedRating = star;
  }

  setHoverRating(star: number) {
    this.hoverRating = star;
  }

  clearHoverRating() {
    this.hoverRating = 0;
  }

  calculateAverageRating(reviews: any[] = []) {
    if (!reviews.length) {
      this.averageRating.set(0);
      return;
    }

    const ratings = reviews
      .map((r: any) => Number(r?.rating || 0))
      .filter((r: number) => r > 0);

    if (!ratings.length) {
      this.averageRating.set(0);
      return;
    }

    const total = ratings.reduce((sum: number, value: number) => sum + value, 0);
    this.averageRating.set(Math.round(total / ratings.length));
  }

  async loadReviews() {
    const post = this.postData();

    if (!post?.postid) {
      this.reviews.set([]);
      this.averageRating.set(0);
      return;
    }

    this.isReviewsLoading.set(true);

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('postid', post.postid)
        .order('createdat', { ascending: false });

      if (error) throw error;

      const reviewList = data || [];
      this.reviews.set(reviewList);
      this.calculateAverageRating(reviewList);
    } catch (error) {
      console.error('Error loading reviews:', error);
      this.reviews.set([]);
      this.averageRating.set(0);
    } finally {
      this.isReviewsLoading.set(false);
    }
  }

  async loadPost() {
    this.isLoading.set(true);

    try {
      const data = await this.supabaseService.getPostById(this.postId);
      

      const imageList: string[] = Array.isArray(data?.image_urls)
        ? data.image_urls.filter((x: any) => typeof x === 'string' && x)
        : [];

      if (data?.image_url && !imageList.includes(data.image_url)) {
        imageList.unshift(data.image_url);
      }

      const videoList: string[] = Array.isArray(data?.video_urls)
        ? data.video_urls.filter((x: any) => typeof x === 'string' && x)
        : [];

      if (data?.video_url && !videoList.includes(data.video_url)) {
        videoList.unshift(data.video_url);
      }

      const catalogItems = this.getNormalizedCatalog(data?.catalog);

      const mappedPost = {
        ...data,
        images: imageList,
        videos: videoList,
        catalogItems,
        sellerName: data?.contactname || 'Seller',
        sellerImage: 'assets/icons/user.png',
        sellerPhone: data?.contactphone || '',
        sellerEmail: data?.contactemail || '',
        whatsappNumber: data?.whatsappnumber || data?.contactphone || '',
        location: this.buildLocation(data),
        displayAddress: this.buildDisplayAddress(data),
        categoryText: this.buildCategoryText(data),
        detailItems: this.buildDetailItems(data),
        latitude: this.toNumberOrNull(data?.latitude),
        longitude: this.toNumberOrNull(data?.longitude)
      };

      this.postData.set(mappedPost);
      await this.loadReviews();

      if (mappedPost.images.length > 0) {
        this.selectedMedia.set({
          type: 'image',
          url: mappedPost.images[0]
        });
      } else if (mappedPost.videos.length > 0) {
        this.selectedMedia.set({
          type: 'video',
          url: mappedPost.videos[0]
        });
      } else {
        this.selectedMedia.set({
          type: 'image',
          url: 'https://via.placeholder.com/600x400?text=No+Image'
        });
      }
    } catch (error) {
      console.error('Error loading post details:', error);
      this.postData.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  buildLocation(data: any): string {
    const location = String(data?.location || '').trim();
    const address = String(data?.address || '').trim();
    const fullAddress = String(data?.full_address || '').trim();
    const placeName = String(data?.place_name || '').trim();

    if (location) return location;
    if (placeName) return placeName;
    if (address) return address;
    if (fullAddress) return fullAddress;

    return 'Location not available';
  }

  buildDisplayAddress(data: any): string {
    const fullAddress = String(data?.full_address || '').trim();
    const address = String(data?.address || '').trim();
    const placeName = String(data?.place_name || '').trim();
    const location = String(data?.location || '').trim();
    const area = String(data?.area || '').trim();
    const district = String(data?.district || '').trim();
    const state = String(data?.state || '').trim();
    const country = String(data?.country || '').trim();

    if (fullAddress) return fullAddress;
    if (address) return address;
    if (placeName) return placeName;
    if (location) return location;

    const parts = [area, district, state, country].filter(Boolean);
    if (parts.length) return parts.join(', ');

    return 'Location not available';
  }

  buildCategoryText(data: any): string {
    const category = String(data?.category || '').trim();
    const subcategory = String(data?.subcategory || '').trim();

    if (category && subcategory) return `${category} • ${subcategory}`;
    if (category) return category;
    if (subcategory) return subcategory;

    return '';
  }

  buildDetailItems(data: any): Array<{ label: string; value: string }> {
    const items: Array<{ label: string; value: string }> = [];

    const categoryText = this.buildCategoryText(data);
    if (categoryText) {
      items.push({ label: 'Category', value: categoryText });
    }

    const adType = String(data?.conditiontype || data?.adtype || '').trim();
    if (adType) {
      items.push({
        label: 'Type',
        value: adType.charAt(0).toUpperCase() + adType.slice(1)
      });
    }

    const status = String(data?.status || '').trim();
    if (status) {
      items.push({ label: 'Status', value: status });
    }

    const seller = String(data?.contactname || '').trim();
    if (seller) {
      items.push({ label: 'Seller', value: seller });
    }

    const phone = String(data?.contactphone || '').trim();
    if (phone) {
      items.push({ label: 'Phone', value: phone });
    }

    const displayAddress = this.buildDisplayAddress(data);
    if (displayAddress && displayAddress !== 'Location not available') {
      items.push({ label: 'Address', value: displayAddress });
    }

    return items;
  }

  getNormalizedCatalog(catalog: any): Array<{ title: string; price: number | null; imageUrl: string }> {
    if (!Array.isArray(catalog)) return [];

    return catalog
      .map((item: any) => ({
        title: String(item?.title || '').trim(),
        price:
          item?.price !== undefined && item?.price !== null && item?.price !== ''
            ? Number(item.price)
            : null,
        imageUrl: String(item?.imageUrl || item?.image_url || '').trim()
      }))
      .filter((item: any) => item.title || item.price !== null || item.imageUrl);
  }

  isServicePost(): boolean {
    const post = this.postData();
    const type = String(post?.conditiontype || post?.adtype || '').toLowerCase();
    return type === 'service';
  }

  hasCatalog(): boolean {
    const post = this.postData();
    return Array.isArray(post?.catalogItems) && post.catalogItems.length > 0;
  }

  selectMedia(type: 'image' | 'video', url: string) {
    this.selectedMedia.set({ type, url });
  }

  toNumberOrNull(value: any): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  hasCoordinates(): boolean {
    const post = this.postData();
    return post?.latitude !== null && post?.latitude !== undefined &&
           post?.longitude !== null && post?.longitude !== undefined;
  }

  mapEmbedUrl(): SafeResourceUrl {
    const post = this.postData();

    if (!post || !this.hasCoordinates()) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }

    const lat = Number(post.latitude);
    const lng = Number(post.longitude);
    const delta = 0.01;

    const url =
      `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openMap() {
    const post = this.postData();
    if (!post) return;

    if (this.hasCoordinates()) {
      const lat = Number(post.latitude);
      const lng = Number(post.longitude);
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
      return;
    }

    const query = encodeURIComponent(post.displayAddress || post.location || '');
    if (query) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    } else {
      alert('Location not available');
    }
  }

  callSeller() {
    const post = this.postData();
    if (!post?.sellerPhone) {
      alert('Phone number not available');
      return;
    }

    window.location.href = 'tel:' + post.sellerPhone;
  }

  whatsappSeller() {
    const post = this.postData();
    const phone = post?.whatsappNumber;

    if (!phone) {
      alert('WhatsApp number not available');
      return;
    }

    window.location.href = 'https://wa.me/' + phone;
  }

  sharePost() {
    const post = this.postData();
    const shareUrl = window.location.href;
    const shareText = `Check this product: ${post?.title || 'Product'}`;

    if ((navigator as any).share) {
      (navigator as any).share({
        title: post?.title || 'Product',
        text: shareText,
        url: shareUrl
      }).catch(() => {});
      return;
    }

    navigator.clipboard.writeText(shareUrl);
    alert('Product link copied successfully!');
  }

  async addToCart(): Promise<void> {
    try {
      const post = this.postData();

      if (!post) {
        alert('Product data not available');
        return;
      }

      const userId = await this.supabaseService.resolveEffectiveUserUuid();

      if (!userId) {
        alert('Please login first');
        this.router.navigate(['/login']);
        return;
      }

      const productId = String(
        post.postid || post.id || post.product_id || post.title || post.name || this.postId
      );

      const { data: existing, error: existingError } = await supabase
        .from('cart_items')
        .select('cart_id, qty')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ qty: Number(existing.qty || 1) + 1 })
          .eq('cart_id', existing.cart_id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: userId,
            product_id: productId,
            name: post.title || post.name || 'Product',
            price: Number(post.price || 0),
            qty: 1,
            image:
              post.image_url ||
              (Array.isArray(post.images) && post.images.length > 0 ? post.images[0] : '') ||
              'assets/no-image.png'
          });

        if (insertError) throw insertError;
      }

      alert('Added to cart successfully!');
      this.router.navigate(['/cart']);
    } catch (error) {
      console.error('Add to cart error:', error);
      alert('Failed to add cart item');
    }
  }

async addToFavorites(): Promise<void> {
  try {
    const post = this.postData();

    if (!post) {
      alert('Product data not available');
      return;
    }

    const userId = await this.supabaseService.resolveEffectiveUserUuid();

    if (!userId) {
      alert('Please login first');
      this.router.navigate(['/login']);
      return;
    }

    const productId = String(
      post.postid || post.id || post.product_id || post.title || post.name || this.postId
    );

    const { data: existing, error: existingError } = await supabase
      .from('favorite_items')
      .select('favorite_id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existingError) {
      console.error('Favorite existing check error:', existingError);
      alert(existingError.message || 'Failed checking favorites');
      return;
    }

    if (existing) {
      alert('Already added to favorites!');
      this.router.navigate(['/favt']);
      return;
    }

    const payload = {
      user_id: userId,
      product_id: productId,
      name: post.title || post.name || 'Product',
      price: Number(post.price || 0),
      location: post.displayAddress || post.location || 'Location not available',
      image:
        post.image_url ||
        (Array.isArray(post.images) && post.images.length > 0 ? post.images[0] : '') ||
        'assets/no-image.png'
    };

    const { error: insertError } = await supabase
      .from('favorite_items')
      .insert(payload);

    if (insertError) {
      console.error('Favorite insert error:', insertError);
      alert(insertError.message || 'Failed to add favorite item');
      return;
    }

    alert('Added to favorites successfully!');
    this.router.navigate(['/favt']);
  } catch (error: any) {
    console.error('Add to favorites error:', error);
    alert(error?.message || 'Failed to add favorite item');
  }
}

  chatSeller() {
    const post = this.postData();

    if (!post?.userid) {
      alert('Seller not available');
      return;
    }

    this.router.navigate(['/chats'], {
      queryParams: {
        postId: post.postid,
        sellerId: post.userid
      }
    });
  }

  onImageSelected(event: any) {
    const files = event?.target?.files;
    this.reviewImages = [];

    if (!files?.length) return;

    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        this.reviewImages.push(e.target.result);
      };

      reader.readAsDataURL(files[i]);
    }
  }

  onVideoSelected(event: any) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      this.reviewVideo = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  async submitReview() {
    if (!this.reviewText.trim()) {
      alert('Please enter review');
      return;
    }

    if (this.selectedRating === 0) {
      alert('Please select star rating');
      return;
    }

    const post = this.postData();

    if (!post?.postid) {
      alert('Post not found');
      return;
    }

    this.isReviewSubmitting.set(true);

    try {
      const userId = await this.supabaseService.resolveEffectiveUserUuid();

      if (!userId) {
        alert('Please login first');
        this.router.navigate(['/login']);
        return;
      }

      const { error } = await supabase
        .from('reviews')
        .insert({
          postid: post.postid,
          userid: userId,
          rating: this.selectedRating,
          reviewtext: this.reviewText,
          reviewimages: this.reviewImages,
          reviewvideo: this.reviewVideo
        });

      if (error) throw error;

      try {
        const sellerUserId = String(post.userid || '').trim();

        if (sellerUserId && sellerUserId !== userId) {
          await this.supabaseService.createNotification({
            userid: sellerUserId,
            title: 'New Review Received',
            message: `Someone reviewed your post "${post.title || ''}".`,
            type: 'review',
            refid: String(post.postid)
          });
          
        } else {
          
        }
      } catch (notificationError) {
        
      }

      alert('Review submitted successfully!');

      this.reviewText = '';
      this.reviewImages = [];
      this.reviewVideo = null;
      this.selectedRating = 0;
      this.hoverRating = 0;
      this.showReviewForm.set(false);

      await this.loadReviews();
    } catch (error) {
      console.error(error);
      alert('Failed to submit review');
    } finally {
      this.isReviewSubmitting.set(false);
    }
  }
}