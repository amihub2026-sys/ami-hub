import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  inject,
} from '@angular/core';
import { SupabaseService } from '../../../../../services/supabase.service';

interface AdminPostItem {
  id: number;
  userId: string;
  title: string;
  price: number;
  category: string;
  subcategory: string;
  type: string;
  adType: string;
  status: string;
  isActive: boolean;
  isFeatured: boolean;
  createdOn: string;
  imageUrl: string;
  rawCreatedOn: string;
}

@Component({
  selector: 'app-admin-posts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-posts.html',
  styleUrls: ['./admin-posts.css'],
})
export class AdminPosts implements OnInit {
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  @Input() searchQuery = '';

  isLoading = true;
  errorMessage = '';
  posts: AdminPostItem[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadPosts();
  }

  async loadPosts(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabaseService.supabase
        .from('post')
        .select(`
          postid,
          userid,
          title,
          price,
          category,
          subcategory,
          conditiontype,
          adtype,
          status,
          isactive,
          isfeatured,
          createdon,
          image_url
        `)
        .order('createdon', { ascending: false });

      if (error) {
        console.error('Load posts error:', error);
        this.errorMessage = 'Failed to load posts.';
        this.posts = [];
        this.cdr.detectChanges();
        return;
      }

      this.posts = (data || []).map((row: any) => ({
        id: Number(row.postid),
        userId: String(row.userid || '-'),
        title: row.title || 'Untitled Post',
        price: Number(row.price || 0),
        category: row.category || '-',
        subcategory: row.subcategory || '-',
        type: row.conditiontype || '-',
        adType: row.adtype || '-',
        status: row.status || 'Unknown',
        isActive: !!row.isactive,
        isFeatured: !!row.isfeatured,
        createdOn: this.formatDate(row.createdon),
        imageUrl: row.image_url || '',
        rawCreatedOn: row.createdon || '',
      }));

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Posts page error:', error);
      this.errorMessage = 'Something went wrong while loading posts.';
      this.posts = [];
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  get filteredPosts(): AdminPostItem[] {
    const q = this.searchQuery.trim().toLowerCase();

    if (!q) return this.posts;

    return this.posts.filter((post) =>
      String(post.id).includes(q) ||
      post.title.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q) ||
      post.subcategory.toLowerCase().includes(q) ||
      post.type.toLowerCase().includes(q) ||
      post.adType.toLowerCase().includes(q) ||
      post.status.toLowerCase().includes(q) ||
      String(post.userId).toLowerCase().includes(q)
    );
  }

  get totalPosts(): number {
    return this.posts.length;
  }

  get activePosts(): number {
    return this.posts.filter((p) => p.isActive).length;
  }

  get featuredPosts(): number {
    return this.posts.filter((p) => p.isFeatured).length;
  }

  get inactivePosts(): number {
    return this.posts.filter((p) => !p.isActive).length;
  }

  async togglePostStatus(post: AdminPostItem): Promise<void> {
    const previousValue = post.isActive;
    post.isActive = !post.isActive;
    this.cdr.detectChanges();

    try {
      const { error } = await this.supabaseService.supabase
        .from('post')
        .update({
          isactive: post.isActive,
          status: post.isActive ? 'Active' : 'Inactive',
        })
        .eq('postid', post.id);

      if (error) {
        console.error('Toggle post status error:', error);
        post.isActive = previousValue;
        this.errorMessage = 'Failed to update post status.';
      }
    } catch (error) {
      console.error('Toggle post status exception:', error);
      post.isActive = previousValue;
      this.errorMessage = 'Failed to update post status.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  async toggleFeatured(post: AdminPostItem): Promise<void> {
    const previousValue = post.isFeatured;
    post.isFeatured = !post.isFeatured;
    this.cdr.detectChanges();

    try {
      const { error } = await this.supabaseService.supabase
        .from('post')
        .update({
          isfeatured: post.isFeatured,
        })
        .eq('postid', post.id);

      if (error) {
        console.error('Toggle featured error:', error);
        post.isFeatured = previousValue;
        this.errorMessage = 'Failed to update featured status.';
      }
    } catch (error) {
      console.error('Toggle featured exception:', error);
      post.isFeatured = previousValue;
      this.errorMessage = 'Failed to update featured status.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  async deletePost(post: AdminPostItem): Promise<void> {
    const confirmed = window.confirm(`Delete post "${post.title}"?`);
    if (!confirmed) return;

    const previousPosts = [...this.posts];
    this.posts = this.posts.filter((p) => p.id !== post.id);
    this.cdr.detectChanges();

    try {
      const { error } = await this.supabaseService.supabase
        .from('post')
        .delete()
        .eq('postid', post.id);

      if (error) {
        console.error('Delete post error:', error);
        this.posts = previousPosts;
        this.errorMessage = 'Failed to delete post.';
      }
    } catch (error) {
      console.error('Delete post exception:', error);
      this.posts = previousPosts;
      this.errorMessage = 'Failed to delete post.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  getStatusLabel(post: AdminPostItem): string {
    return post.isActive ? 'Active' : 'Inactive';
  }

  getStatusClass(post: AdminPostItem): string {
    return post.isActive ? 'status-active' : 'status-inactive';
  }

  trackByPost(index: number, post: AdminPostItem): number {
    return post.id;
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) return '-';

    const date = new Date(value);

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}