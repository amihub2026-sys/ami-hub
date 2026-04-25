import { Component, OnInit, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { supabase } from '../../../supabaseClient';
import { SupabaseService } from '../../services/supabase.service';
import { SnackbarService } from '../../services/snackbar.service';
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
  private cdr: ChangeDetectorRef,
  private supabaseService: SupabaseService,
  private snackbar: SnackbarService
) {}

 async ngOnInit(): Promise<void> {
  await this.loadFavoriteItems();


}

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

private showAlert(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  this.snackbar.show(message, type);
}
  private mapFavorite(item: any): FavoriteItem {
    return {
      favorite_id: Number(item.favorite_id),
      product_id: item.product_id ? String(item.product_id) : null,
      name: item.name ?? '',
      price: Number(item.price ?? 0),
      location: item.location ?? 'Location not available',
      image: item.image ?? 'assets/no-image.png'
    };
  }

  private mergeFavorites(...lists: any[][]): FavoriteItem[] {
    const map = new Map<number, FavoriteItem>();

    for (const list of lists) {
      for (const item of list || []) {
        const favorite = this.mapFavorite(item);
        if (!map.has(favorite.favorite_id)) {
          map.set(favorite.favorite_id, favorite);
        }
      }
    }

    return Array.from(map.values());
  }

  private async getFavoritesByUserUuid(userUuid: string): Promise<any[]> {
    if (!userUuid) return [];

    const { data, error } = await supabase
      .from('favorite_items')
      .select('favorite_id, product_id, name, price, location, image')
      .eq('user_id', userUuid)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async loadFavoriteItems(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.favoriteItems = [];
    this.cdr.detectChanges();
   

    try {
      const session = await this.supabaseService.getEffectiveAuthUser();

  if (!session.isAuthenticated) {
  this.favoriteItems = [];
  this.errorMessage = 'Please login to view your favorites.';
  this.showAlert('Please login to view your favorites', 'error');
  return;
}
      const authUserId = session.authUser?.id || '';
      let resolvedUuid = await this.supabaseService.getEffectiveFavoriteUserUuid();

      if (!resolvedUuid && authUserId) {
        resolvedUuid = authUserId;
      }

   if (!resolvedUuid) {
  this.favoriteItems = [];
  this.errorMessage = 'User not found.';
  this.showAlert('User not found', 'error');
  return;
}
      const results: any[][] = [];

      if (authUserId) {
        const authFavorites = await this.getFavoritesByUserUuid(authUserId);
        results.push(authFavorites);
      }

      if (resolvedUuid && resolvedUuid !== authUserId) {
        const localFavorites = await this.getFavoritesByUserUuid(resolvedUuid);
        results.push(localFavorites);
      }

      this.favoriteItems = this.mergeFavorites(...results);
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      const msg = error?.message || 'Failed to load favorites.';
this.errorMessage = msg;
this.favoriteItems = [];
this.showAlert(msg, 'error');
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

    this.showAlert('Product id not available');
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

this.showAlert('Favorite removed successfully', 'success');
    } catch (error) {
      console.error('Error removing favorite item:', error);
      this.showAlert('Failed to remove favorite item', 'error');
    }
  }
}