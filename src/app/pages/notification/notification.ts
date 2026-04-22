import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { supabase } from '../../../supabaseClient';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrls: ['./notification.css']
})
export class Notification implements OnInit {
  notifications = signal<any[]>([]);
  isLoading = signal(false);

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadNotifications();
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private hasLocalUserLogin(): boolean {
    return this.isBrowser() && localStorage.getItem('userToken') === 'loggedUser';
  }

  private getLocalUserEmail(): string {
    if (!this.isBrowser()) return '';
    return localStorage.getItem('userEmail') || '';
  }

  private getLocalSupabaseUid(): string {
    if (!this.isBrowser()) return '';
    return localStorage.getItem('supabase_uid') || '';
  }

  private setLocalSupabaseUid(value: string): void {
    if (!this.isBrowser()) return;
    if (value) {
      localStorage.setItem('supabase_uid', value);
    }
  }

  private async resolveNotificationUserUuid(): Promise<string> {
    const localSupabaseUid = this.getLocalSupabaseUid();
    if (localSupabaseUid) {
      return localSupabaseUid;
    }

    const localUserEmail = this.getLocalUserEmail();
    if (!localUserEmail) {
      return '';
    }

    const { data, error } = await supabase
      .from('users')
      .select('supabase_uid, auth_user_id, user_id')
      .eq('email', localUserEmail)
      .maybeSingle();

    if (error || !data) {
      return '';
    }

    const resolvedUuid =
      data.supabase_uid ||
      data.auth_user_id ||
      data.user_id ||
      '';

    if (resolvedUuid) {
      this.setLocalSupabaseUid(resolvedUuid);
    }

    return resolvedUuid;
  }

  private mergeNotifications(...lists: any[][]): any[] {
    const map = new Map<any, any>();

    for (const list of lists) {
      for (const item of list || []) {
        const key = item?.notificationid;
        if (key != null && !map.has(key)) {
          map.set(key, item);
        }
      }
    }

    return Array.from(map.values()).sort((a: any, b: any) => {
      const aTime = new Date(a?.createdat || 0).getTime();
      const bTime = new Date(b?.createdat || 0).getTime();
      return bTime - aTime;
    });
  }

  async loadNotifications() {
    this.isLoading.set(true);

    try {
      const user = await this.supabaseService.getCurrentUser();
      const localLoggedIn = this.hasLocalUserLogin();

      if (!user && !localLoggedIn) {
        this.notifications.set([]);
        return;
      }

      const results: any[][] = [];

      if (user?.id) {
        const data = await this.supabaseService.getNotificationsByUser(user.id);
        results.push(Array.isArray(data) ? data : []);
      }

      let resolvedUuid = await this.resolveNotificationUserUuid();

      if (!resolvedUuid && user?.id) {
        resolvedUuid = user.id;
        this.setLocalSupabaseUid(resolvedUuid);
      }

      if (resolvedUuid && resolvedUuid !== user?.id) {
        const data = await this.supabaseService.getNotificationsByUser(resolvedUuid);
        results.push(Array.isArray(data) ? data : []);
      }

      const merged = this.mergeNotifications(...results).map((item: any) => ({
        ...item,
        icon: this.getNotificationIcon(item.type),
        time: this.getTimeAgo(item.createdat)
      }));

      this.notifications.set(merged);
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  getNotificationIcon(type: string): string {
    const t = String(type || '').toLowerCase();

    if (t.includes('message') || t.includes('chat')) return '💬';
    if (t.includes('review')) return '⭐';
    if (t.includes('featured')) return '🚀';
    if (t.includes('post')) return '📢';
    if (t.includes('approve')) return '✅';
    if (t.includes('favorite')) return '❤️';
    if (t.includes('alert')) return '🔔';

    return '🔔';
  }

  getTimeAgo(dateValue: string): string {
    if (!dateValue) return '';

    const now = new Date().getTime();
    const created = new Date(dateValue).getTime();
    const diff = Math.floor((now - created) / 1000);

    if (diff < 60) return 'Just now';

    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;

    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }

  async markAsRead(item: any): Promise<void> {
    if (!item || item.isread) {
      this.handleNotificationClick(item);
      return;
    }

    try {
      await this.supabaseService.markNotificationAsRead(item.notificationid);

      this.notifications.update((list) =>
        list.map((n) =>
          n.notificationid === item.notificationid
            ? { ...n, isread: true }
            : n
        )
      );

      this.handleNotificationClick(item);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllRead(): Promise<void> {
    try {
      const user = await this.supabaseService.getCurrentUser();
      let resolvedUuid = await this.resolveNotificationUserUuid();

      if (!resolvedUuid && user?.id) {
        resolvedUuid = user.id;
      }

      if (!resolvedUuid) return;

      await this.supabaseService.markAllNotificationsAsRead(resolvedUuid);

      this.notifications.update((list) =>
        list.map((item) => ({ ...item, isread: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  handleNotificationClick(item: any) {
    if (!item?.refid) return;

    if (
      item.type === 'post' ||
      item.type === 'featured' ||
      item.type === 'review' ||
      item.type === 'message'
    ) {
      this.router.navigate(['/post-view', item.refid]);
    }
  }
}