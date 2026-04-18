import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AdminMenuKey =
  | 'dashboard'
  | 'users'
  | 'posts'
  | 'advertise'
  | 'categories'
  | 'subcategories'
  | 'services'
  | 'matrimony'
  | 'jobs'
  | 'subscriptions'
  | 'user-subscriptions'
  | 'boost-plans'
  | 'payments'
  | 'reports'
  | 'locations'
  | 'banners'
  | 'notifications'
  | 'settings';

interface AdminMenuItem {
  key: AdminMenuKey;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-sidebar.html',
  styleUrls: ['./admin-sidebar.css'],
})
export class AdminSidebar {
  @Input() activeMenu: AdminMenuKey = 'dashboard';
  @Input() sidebarOpen = false;

  @Output() menuChange = new EventEmitter<AdminMenuKey>();

  readonly menuItems: AdminMenuItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'users', label: 'Users', icon: '👤' },
    { key: 'posts', label: 'Posts', icon: '📝' },
    { key: 'advertise', label: 'Advertise', icon: '📢' },
    { key: 'categories', label: 'Categories', icon: '📁' },
    { key: 'subcategories', label: 'Subcategories', icon: '📂' },
    { key: 'services', label: 'Services', icon: '🛠️' },
    { key: 'matrimony', label: 'Matrimony', icon: '💍' },
    { key: 'jobs', label: 'Jobs', icon: '💼' },
    { key: 'subscriptions', label: 'Subscriptions', icon: '📦' },
    { key: 'user-subscriptions', label: 'User Subscriptions', icon: '🧾' },
    { key: 'boost-plans', label: 'Boost Plans', icon: '🚀' },
    { key: 'payments', label: 'Payments', icon: '💳' },
    { key: 'reports', label: 'Reports', icon: '📈' },
    { key: 'locations', label: 'Locations', icon: '📍' },
    { key: 'banners', label: 'Banners', icon: '🖼️' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  onMenuClick(menu: AdminMenuKey): void {
    this.menuChange.emit(menu);
  }

  trackByMenu(index: number, item: AdminMenuItem): AdminMenuKey {
    return item.key;
  }
}