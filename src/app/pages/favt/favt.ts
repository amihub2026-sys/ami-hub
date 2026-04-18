import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { supabase } from '../../../supabaseClient';

interface FavoriteItem {
  favorite_id: number;
  product_id: string | null;
  name: string;
  price: number;
  location: string;
  image: string;
}

@Component({
  selector: 'app-favt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './favt.html',
  styleUrls: ['./favt.css']
})
export class Favt implements OnInit {
  favoriteItems: FavoriteItem[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadFavoriteItems();
  }

  async loadFavoriteItems(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.favoriteItems = [];
    this.cdr.detectChanges();

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user = sessionData?.session?.user;

      if (!user) {
        this.favoriteItems = [];
        this.errorMessage = 'Please login to view your favorites.';
        return;
      }

      const { data, error } = await supabase
        .from('favorite_items')
        .select('favorite_id, product_id, name, price, location, image')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      this.favoriteItems = (data || []).map((item: any) => ({
        favorite_id: Number(item.favorite_id),
        product_id: item.product_id ? String(item.product_id) : null,
        name: item.name ?? '',
        price: Number(item.price ?? 0),
        location: item.location ?? 'Location not available',
        image: item.image ?? 'assets/no-image.png'
      }));
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      this.errorMessage = error?.message || 'Failed to load favorites.';
      this.favoriteItems = [];
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  viewDetails(item: FavoriteItem): void {
    if (item.product_id) {
      this.router.navigate(['/post-view', item.product_id]);
      return;
    }

    alert('Product id not available');
  }

  async removeItem(item: FavoriteItem): Promise<void> {
    try {
      const { error } = await supabase
        .from('favorite_items')
        .delete()
        .eq('favorite_id', item.favorite_id);

      if (error) {
        throw error;
      }

      this.favoriteItems = this.favoriteItems.filter(
        favorite => favorite.favorite_id !== item.favorite_id
      );
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error removing favorite item:', error);
      alert('Failed to remove favorite item');
    }
  }
}