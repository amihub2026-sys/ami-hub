import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

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
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUserPosts();
  }

  async loadCurrentUserPosts(): Promise<void> {
    this.isLoading.set(true);

    try {
      const user = await this.supabaseService.getCurrentUser();

      if (!user) {
        this.posts.set([]);
        alert('Please login first');
        this.router.navigate(['/login'], {
          state: { redirectTo: 'my-posts' }
        });
        return;
      }

      const data = await this.supabaseService.getPostsByUserId(user.id, 0, 100);
      this.posts.set(Array.isArray(data) ? data : []);
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
      alert('Post id not found');
      return;
    }

    console.log('Opening edit page for post:', post.postid);

    const success = await this.router.navigate(['/edit-post', String(post.postid)]);

    if (!success) {
      console.error('Navigation failed for edit post:', post.postid);
      alert('Failed to open edit page');
    }
  }

  async featurePost(post: any, event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (!post?.postid) {
      console.warn('Missing postid for feature:', post);
      alert('Post id not found');
      return;
    }

    if (this.isFeatured(post)) {
      alert('This post is already featured');
      return;
    }

    const adType = this.getAdType(post);

    console.log('Opening featured plan for post:', post.postid, 'type:', adType);

    const success = await this.router.navigate(['/featured-plan'], {
      state: {
        postId: Number(post.postid),
        adType: adType
      }
    });

    if (!success) {
      console.error('Navigation failed for featured post:', post.postid);
      alert('Failed to open featured plan');
    }
  }

  async removePost(post: any, event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (!post?.postid) {
      alert('Post id not found');
      return;
    }

    const confirmed = confirm('Are you sure you want to remove this post?');
    if (!confirmed) {
      return;
    }

    try {
      const user = await this.supabaseService.getCurrentUser();

      console.log('Logged in user id:', user?.id);
      console.log('Clicked post:', post);

      if (!user) {
        alert('Please login first');
        this.router.navigate(['/login']);
        return;
      }

      const { data, error } = await this.supabaseService.supabase
        .from('post')
        .delete()
        .eq('postid', Number(post.postid))
        .select('postid, userid');

      console.log('Delete response:', { data, error });

      if (error) {
        console.error('Delete error:', error);
        alert(error.message || 'Failed to remove post');
        return;
      }

      if (!data || data.length === 0) {
        alert('Delete blocked in Supabase. Fix RLS policy / userid match.');
        return;
      }

      this.posts.set(
        this.posts().filter(item => item.postid !== post.postid)
      );

      alert('Post removed successfully');
    } catch (error) {
      console.error('Error removing post:', error);
      alert('Failed to remove post');
    }
  }

  trackByPostId(index: number, post: any): any {
    return post?.postid ?? index;
  }
}