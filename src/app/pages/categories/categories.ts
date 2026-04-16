import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './categories.html',
  styleUrls: ['./categories.css']
})
export class Categories implements OnInit {
  categories = signal<any[]>([]);
  isLoading = signal(false);

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.isLoading.set(true);

    try {
      const data = await this.supabaseService.getAllBrowseCategories();
      this.categories.set(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categories.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  openCategory(cat: any) {
    if (cat.category_type === 'service') {
      this.router.navigate(['/service-list'], {
        queryParams: { category: cat.categoryid }
      });
    } else {
      this.router.navigate(['/products'], {
        queryParams: { category: cat.categoryid }
      });
    }
  }

  getImage(cat: any): string {
    return cat?.iconurl && cat.iconurl.trim() !== ''
      ? cat.iconurl
      : 'assets/icons/default.png';
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/icons/default.png';
  }
}