import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './news.html',
  styleUrls: ['./news.css']
})
export class News implements OnInit {

  loading = false;
  selectedType: string = 'all';

  tabs = [
    { key: 'all', label: 'All' },
    { key: 'general', label: 'General' },
    { key: 'offer', label: 'Offers' },
    { key: 'announcement', label: 'Announcements' },
    { key: 'promo', label: 'Promos' }
  ];

  newsList: any[] = [];
  featuredNews: any[] = [];

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit(): Promise<void> {
    await this.loadNews();
  }

  async loadNews(type: string = this.selectedType): Promise<void> {
    this.loading = true;
    this.selectedType = type;

    try {
      const data = await this.supabaseService.getNewsFeed(type, 30);

      this.featuredNews = (data || [])
        .filter((item: any) => item.is_featured)
        .slice(0, 5);

      this.newsList = data || [];

    } catch (error) {
      console.error('Load News Error:', error);
      this.newsList = [];
      this.featuredNews = [];
    }

    this.loading = false;
  }

  // ✅ FIXED (no more error)
  openLink(item: any): void {
    if (item?.link_url) {
      window.open(item.link_url, '_blank');
    }
  }

  trackByNewsId(index: number, item: any): any {
    return item?.newsid ?? index;
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'general':
        return 'General';
      case 'offer':
        return 'Offer';
      case 'announcement':
        return 'Announcement';
      case 'promo':
        return 'Promo';
      default:
        return 'Update';
    }
  }
}