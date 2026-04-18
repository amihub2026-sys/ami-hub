import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminMenuKey } from '../admin-sidebar/admin-sidebar';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-topbar.html',
  styleUrls: ['./admin-topbar.css'],
})
export class AdminTopbar {
  @Input() username = 'Admin';
  @Input() pageTitle = 'Dashboard';
  @Input() activeMenu: AdminMenuKey = 'dashboard';

  @Input() searchQuery = '';
  @Output() searchQueryChange = new EventEmitter<string>();

  @Output() menuToggle = new EventEmitter<void>();

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchQueryChange.emit(this.searchQuery);
  }

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  get pageSubtitle(): string {
    switch (this.activeMenu) {
      case 'dashboard':
        return 'Overview of your platform performance';
      case 'users':
        return 'Manage registered users and profiles';
      case 'posts':
        return 'Manage ads, listings, and approvals';
      case 'categories':
        return 'Manage main marketplace categories';
      case 'subcategories':
        return 'Manage subcategory structure';
      case 'services':
        return 'Manage service listings and providers';
      case 'matrimony':
        return 'Manage matrimony profiles and activity';
      case 'jobs':
        return 'Manage jobs and applications';
      case 'subscriptions':
        return 'Manage subscription plans';
      case 'user-subscriptions':
        return 'Track purchased plans by users';
      case 'boost-plans':
        return 'Manage featured and boost plans';
      case 'payments':
        return 'Track all transactions and payment records';
      case 'reports':
        return 'View reports and analytics';
      case 'locations':
        return 'Manage locations, cities, and areas';
      case 'banners':
        return 'Manage homepage banners and promotions';
      case 'notifications':
        return 'Manage alerts and push messages';
      case 'settings':
        return 'Control admin system settings';
      default:
        return 'Admin control panel';
    }
  }
}