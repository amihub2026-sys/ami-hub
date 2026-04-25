import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { SnackbarService } from '../../services/snackbar.service';
@Component({
  selector: 'app-my-posts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-posts.html',
  styleUrls: ['./my-posts.css']
})
export class MyPosts implements OnInit {
  posts = signal<any[]>([]);
  isLoading = signal(true);

 constructor(
  private router: Router,
  private supabaseService: SupabaseService,
  private snackbar: SnackbarService   // 🔥 ADD THIS
) {}

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUserPosts();
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

private showAlert(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  this.snackbar.show(message, type);
}

  private showConfirm(message: string): boolean {
    if (this.isBrowser()) {
      return confirm(message);
    }
    return false;
  }

  private mergePosts(...postLists: any[][]): any[] {
    const map = new Map<any, any>();

    for (const list of postLists) {
      for (const post of list || []) {
        const key = post?.postid;
        if (key != null && !map.has(key)) {
          map.set(key, post);
        }
      }
    }

    return Array.from(map.values());
  }

  async loadCurrentUserPosts(): Promise<void> {
    this.isLoading.set(true);

    try {
      const session = await this.supabaseService.getEffectiveAuthUser();

      if (!session.isAuthenticated) {
        this.posts.set([]);
        this.showAlert('Please login first', 'error');
        this.router.navigate(['/login'], {
          state: { redirectTo: 'my-posts' }
        });
        return;
      }

      const authUserId = session.authUser?.id || '';
      const localUserId = session.userid || '';
      const resolvedUuid = await this.supabaseService.resolveEffectiveUserUuid();

      const results: any[][] = [];

      if (localUserId) {
        const data = await this.supabaseService.getPostsByUserId(localUserId, 0, 100);
        results.push(Array.isArray(data) ? data : []);
      }

      if (resolvedUuid && resolvedUuid !== localUserId) {
        const data = await this.supabaseService.getPostsByUserId(resolvedUuid, 0, 100);
        results.push(Array.isArray(data) ? data : []);
      }

      if (
        authUserId &&
        authUserId !== localUserId &&
        authUserId !== resolvedUuid
      ) {
        const data = await this.supabaseService.getPostsByUserId(authUserId, 0, 100);
        results.push(Array.isArray(data) ? data : []);
      }

      const mergedPosts = this.mergePosts(...results);
      this.posts.set(mergedPosts);
    } catch (error) {
      console.error('Error loading my posts:', error);
      this.posts.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  getMainImage(post: any): string {
    const imageUrl =
      post?.image_url ||
      (Array.isArray(post?.image_urls) && post.image_urls.length > 0
        ? post.image_urls[0]
        : '');

    if (!imageUrl || typeof imageUrl !== 'string') {
      return 'assets/no-image.png';
    }

    return imageUrl;
  }

  getAdType(post: any): string {
    const type = String(
      post?.adtype || post?.conditiontype || 'service'
    ).toLowerCase().trim();

    return type === 'product' ? 'product' : 'service';
  }

  isFeatured(post: any): boolean {
    return !!(post?.isfeatured || post?.is_featured);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/no-image.png';
    }
  }

  openDetails(post: any): void {
    if (!post?.postid) {
      return;
    }

    this.router.navigate(['/details', String(post.postid)]);
  }

  async editPost(post: any, event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (!post?.postid) {
      console.warn('Missing postid for edit:', post);
      this.showAlert('Post id not found');
      return;
    }

    

    const success = await this.router.navigate(['/edit-post', String(post.postid)]);

    if (!success) {
      console.error('Navigation failed for edit post:', post.postid);
      this.showAlert('Failed to open edit page');
    }
  }

  private buildFeaturePostPayload(post: any): any {
    return {
      ...post,
      postid: Number(post?.postid),
      userid: post?.userid ?? null,
      title: post?.title ?? '',
      description: post?.description ?? '',
      price: Number(post?.price ?? 0),
      currencycode: post?.currencycode || 'INR',
      categoryid: post?.categoryid ?? null,
      subcategoryid: post?.subcategoryid ?? null,
      conditiontype: post?.conditiontype || post?.adtype || this.getAdType(post),
      adtype: post?.adtype || post?.conditiontype || this.getAdType(post),
      status: post?.status || 'Active',
      isactive: post?.isactive ?? true,
      image_url: post?.image_url || '',
      image_urls: Array.isArray(post?.image_urls) ? post.image_urls : [],
      video_url: post?.video_url || '',
      video_urls: Array.isArray(post?.video_urls) ? post.video_urls : [],
      contactname: post?.contactname || '',
      contactemail: post?.contactemail || '',
      contactphone: post?.contactphone || '',
      whatsappnumber: post?.whatsappnumber || '',
      location: post?.location || '',
      cityid: post?.cityid ?? null,
      areaid: post?.areaid ?? null,
      full_address: post?.full_address || '',
      latitude: post?.latitude ?? null,
      longitude: post?.longitude ?? null,
      custom_fields: post?.custom_fields ?? null,
      isfeatured: false,
      is_featured: false,
      featured_plan_id: null,
      featured_plan_name: null
    };
  }

  async featurePost(post: any, event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (!post?.postid) {
      console.warn('Missing postid for feature:', post);
      this.showAlert('Post id not found');
      return;
    }

    if (this.isFeatured(post)) {
      this.showAlert('This post is already featured');
      return;
    }

    const adType = this.getAdType(post);
    const featurePayload = this.buildFeaturePostPayload(post);

    try {
      if (this.isBrowser()) {
        localStorage.setItem(
          'pending_post_payload',
          JSON.stringify(featurePayload)
        );

        localStorage.setItem('pending_post_flow', 'featured');
        localStorage.setItem('pending_post_type', adType);
        localStorage.setItem(
          'pending_post_userid',
          String(featurePayload?.userid ?? '')
        );
      }

    

      const success = await this.router.navigate(['/featured-plan'], {
        state: {
          postId: Number(post.postid),
          adType: adType,
          postDetails: featurePayload
        }
      });

      if (!success) {
        console.error('Navigation failed for featured post:', post.postid);
        this.showAlert('Failed to open featured plan');
      }
    } catch (error) {
      console.error('Error preparing featured flow:', error);
      this.showAlert('Failed to open featured plan');
    }
  }

  async removePost(post: any, event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (!post?.postid) {
      this.showAlert('Post id not found');
      return;
    }

    const confirmed = this.showConfirm('Are you sure you want to remove this post?');
    if (!confirmed) {
      return;
    }

    try {
      const session = await this.supabaseService.getEffectiveAuthUser();

      if (!session.isAuthenticated) {
        this.showAlert('Please login first');
        this.router.navigate(['/login']);
        return;
      }

      const { data, error } = await this.supabaseService.supabase
        .from('post')
        .delete()
        .eq('postid', Number(post.postid))
        .select('postid, userid');

      

      if (error) {
        console.error('Delete error:', error);
        this.showAlert(error.message || 'Failed to remove post');
        return;
      }

      if (!data || data.length === 0) {
        this.showAlert('Delete blocked in Supabase. Fix RLS policy / userid match.');
        return;
      }

      this.posts.set(
        this.posts().filter(item => item.postid !== post.postid)
      );

      this.showAlert('Post removed successfully', 'success');
    } catch (error) {
      console.error('Error removing post:', error);
      this.showAlert('Failed to remove post');
    }
  }

  trackByPostId(index: number, post: any): any {
    return post?.postid ?? index;
  }
}