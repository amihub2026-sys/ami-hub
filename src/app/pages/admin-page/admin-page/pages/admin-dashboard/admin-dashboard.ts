import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  inject,
} from '@angular/core';
import { SupabaseService } from '../../../../../services/supabase.service';

interface DashboardStat {
  title: string;
  value: string;
  icon: string;
  bg: string;
  color: string;
  change: string;
}

interface ActivityItem {
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
})
export class AdminDashboard implements OnInit {
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  isLoading = true;
  errorMessage = '';

  totalUsers = 0;
  totalPosts = 0;
  activeSubscriptions = 0;
  totalRevenueAmount = 0;

  recentActivities: ActivityItem[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.ngZone.run(() => {
      this.isLoading = true;
      this.errorMessage = '';
      this.cdr.detectChanges();
    });

    try {
      await Promise.all([
        this.loadUserCount(),
        this.loadPostCount(),
        this.loadSubscriptionCount(),
        this.loadRevenue(),
        this.loadRecentActivities(),
      ]);
    } catch (error) {
      console.error('Dashboard load error:', error);

      this.ngZone.run(() => {
        this.errorMessage = 'Failed to load dashboard data.';
      });
    } finally {
      this.ngZone.run(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async loadUserCount(): Promise<void> {
    const { count, error } = await this.supabaseService.supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    this.ngZone.run(() => {
      if (error) {
        console.error('loadUserCount error:', error);
        this.totalUsers = 0;
      } else {
        this.totalUsers = count || 0;
      }
      this.cdr.detectChanges();
    });
  }

  async loadPostCount(): Promise<void> {
    const { count, error } = await this.supabaseService.supabase
      .from('post')
      .select('*', { count: 'exact', head: true });

    this.ngZone.run(() => {
      if (error) {
        console.error('loadPostCount error:', error);
        this.totalPosts = 0;
      } else {
        this.totalPosts = count || 0;
      }
      this.cdr.detectChanges();
    });
  }

  async loadSubscriptionCount(): Promise<void> {
    const { count, error } = await this.supabaseService.supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('isactive', true);

    this.ngZone.run(() => {
      if (error) {
        console.error('loadSubscriptionCount error:', error);
        this.activeSubscriptions = 0;
      } else {
        this.activeSubscriptions = count || 0;
      }
      this.cdr.detectChanges();
    });
  }

  async loadRevenue(): Promise<void> {
    const { data, error } = await this.supabaseService.supabase
      .from('user_subscriptions')
      .select('amountpaid, paymentstatus, isactive')
      .eq('isactive', true);

    this.ngZone.run(() => {
      if (error) {
        console.error('loadRevenue error:', error);
        this.totalRevenueAmount = 0;
      } else {
        this.totalRevenueAmount = (data || [])
          .filter((item: any) => (item.paymentstatus || '').toLowerCase() === 'paid')
          .reduce((sum: number, item: any) => sum + Number(item.amountpaid || 0), 0);
      }
      this.cdr.detectChanges();
    });
  }

  async loadRecentActivities(): Promise<void> {
    const activityItems: ActivityItem[] = [];

    const [usersRes, postsRes, subsRes, paymentsRes] = await Promise.all([
      this.supabaseService.supabase
        .from('users')
        .select('fullname, email, createdon')
        .order('createdon', { ascending: false })
        .limit(3),

      this.supabaseService.supabase
        .from('post')
        .select('title, createdon, adtype, conditiontype')
        .order('createdon', { ascending: false })
        .limit(3),

      this.supabaseService.supabase
        .from('user_subscriptions')
        .select('createdon, paymentstatus, amountpaid')
        .order('createdon', { ascending: false })
        .limit(3),

      this.supabaseService.supabase
        .from('payments')
        .select('plan_name, amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    if (!usersRes.error) {
      for (const user of usersRes.data || []) {
        activityItems.push({
          title: 'New user registered',
          subtitle: user.fullname || user.email || 'New user joined',
          time: this.timeAgo(user.createdon),
          icon: '👤',
          createdAt: user.createdon || '',
        });
      }
    } else {
      console.error('loadRecentActivities users error:', usersRes.error);
    }

    if (!postsRes.error) {
      for (const post of postsRes.data || []) {
        activityItems.push({
          title: 'New post created',
          subtitle: post.title || post.adtype || post.conditiontype || 'New post added',
          time: this.timeAgo(post.createdon),
          icon: '📝',
          createdAt: post.createdon || '',
        });
      }
    } else {
      console.error('loadRecentActivities posts error:', postsRes.error);
    }

    if (!subsRes.error) {
      for (const sub of subsRes.data || []) {
        activityItems.push({
          title: 'Subscription purchased',
          subtitle: `Status: ${sub.paymentstatus || 'paid'} | Amount: ₹${Number(
            sub.amountpaid || 0
          ).toLocaleString('en-IN')}`,
          time: this.timeAgo(sub.createdon),
          icon: '⭐',
          createdAt: sub.createdon || '',
        });
      }
    } else {
      console.error('loadRecentActivities subscriptions error:', subsRes.error);
    }

    if (!paymentsRes.error) {
      for (const payment of paymentsRes.data || []) {
        activityItems.push({
          title: 'Payment received',
          subtitle: `${payment.plan_name || 'Payment'} • ₹${Number(
            payment.amount || 0
          ).toLocaleString('en-IN')}`,
          time: this.timeAgo(payment.created_at),
          icon: '💳',
          createdAt: payment.created_at || '',
        });
      }
    } else {
      console.error('loadRecentActivities payments error:', paymentsRes.error);
    }

    this.ngZone.run(() => {
      this.recentActivities = activityItems
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 6);

      this.cdr.detectChanges();
    });
  }

  get stats(): DashboardStat[] {
    return [
      {
        title: 'Total Users',
        value: this.totalUsers.toLocaleString('en-IN'),
        icon: '👥',
        color: '#335cff',
        bg: 'linear-gradient(135deg, #eef4ff 0%, #dbeafe 100%)',
        change: 'Live',
      },
      {
        title: 'Total Posts',
        value: this.totalPosts.toLocaleString('en-IN'),
        icon: '📝',
        color: '#ff7a00',
        bg: 'linear-gradient(135deg, #fff5eb 0%, #ffedd5 100%)',
        change: 'Live',
      },
      {
        title: 'Active Subscriptions',
        value: this.activeSubscriptions.toLocaleString('en-IN'),
        icon: '⭐',
        color: '#16a34a',
        bg: 'linear-gradient(135deg, #ecfdf3 0%, #dcfce7 100%)',
        change: 'Live',
      },
      {
        title: 'Revenue',
        value: this.formattedRevenue,
        icon: '💰',
        color: '#7c3aed',
        bg: 'linear-gradient(135deg, #f7f0ff 0%, #ede9fe 100%)',
        change: 'Paid',
      },
    ];
  }

  get formattedRevenue(): string {
    if (this.totalRevenueAmount >= 10000000) {
      return `₹${(this.totalRevenueAmount / 10000000).toFixed(1)}Cr`;
    }

    if (this.totalRevenueAmount >= 100000) {
      return `₹${(this.totalRevenueAmount / 100000).toFixed(1)}L`;
    }

    return `₹${this.totalRevenueAmount.toLocaleString('en-IN')}`;
  }

  get totalActivities(): number {
    return this.recentActivities.length;
  }

  trackByStat(index: number, stat: DashboardStat): string {
    return stat.title;
  }

  trackByActivity(index: number, activity: ActivityItem): string {
    return `${activity.title}-${activity.createdAt}-${index}`;
  }

  private timeAgo(value: string | null | undefined): string {
    if (!value) return 'Recently';

    const date = new Date(value);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-IN');
  }
}