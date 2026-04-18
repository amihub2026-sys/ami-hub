import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  AdminSidebar,
  AdminMenuKey as SidebarAdminMenuKey,
} from './admin-page/components/admin-sidebar/admin-sidebar';
import { AdminTopbar } from './admin-page/components/admin-topbar/admin-topbar';
import { AdminDashboard } from './admin-page/pages/admin-dashboard/admin-dashboard';
import { AdminUsers } from './admin-page/pages/admin-users/admin-users';
import { AdminPosts } from './admin-page/pages/admin-posts/admin-posts';
import { AdminCategoriesComponent } from './admin-page/pages/admin-categories/admin-categories';
import { AdminSubcategories } from './admin-page/pages/admin-subcategories/admin-subcategories';
import { AdminSubscriptionsComponent } from './admin-page/pages/admin-subscriptions/admin-subscriptions';
import { AdminUserSubscriptionsComponent } from './admin-page/pages/admin-user-subscriptions/admin-user-subscriptions';
import { AdminBoostPlansComponent } from './admin-page/pages/admin-boost-plans/admin-boost-plans';
import { AdminPaymentsComponent } from './admin-page/pages/admin-payments/admin-payments';

type AdminMenuKey = SidebarAdminMenuKey | 'advertise';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminSidebar,
    AdminTopbar,
    AdminDashboard,
    AdminUsers,
    AdminPosts,
    AdminCategoriesComponent,
    AdminSubcategories,
    AdminSubscriptionsComponent,
    AdminUserSubscriptionsComponent,
    AdminBoostPlansComponent,
    AdminPaymentsComponent,
  ],
  templateUrl: './admin-page.html',
  styleUrls: ['./admin-page.css'],
})
export class AdminPage {
  username = 'Admin';
  sidebarOpen = false;
  searchQuery = '';
  activeMenu: AdminMenuKey = 'dashboard';

  constructor(private router: Router) {}

  setActiveMenu(menu: AdminMenuKey): void {
    this.sidebarOpen = false;
    this.searchQuery = '';

    if (menu === 'advertise') {
      this.router.navigate(['/service']);
      return;
    }

    this.activeMenu = menu;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  get pageTitle(): string {
    switch (this.activeMenu) {
      case 'dashboard':
        return 'Dashboard';
      case 'users':
        return 'Users';
      case 'posts':
        return 'Posts';
      case 'categories':
        return 'Categories';
      case 'subcategories':
        return 'Subcategories';
      case 'services':
        return 'Services';
      case 'matrimony':
        return 'Matrimony';
      case 'jobs':
        return 'Jobs';
      case 'subscriptions':
        return 'Subscriptions';
      case 'user-subscriptions':
        return 'User Subscriptions';
      case 'boost-plans':
        return 'Boost Plans';
      case 'payments':
        return 'Payments';
      case 'reports':
        return 'Reports';
      case 'locations':
        return 'Locations';
      case 'banners':
        return 'Banners';
      case 'notifications':
        return 'Notifications';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  }

  get isSearchVisible(): boolean {
    return (
      this.activeMenu === 'users' ||
      this.activeMenu === 'posts' ||
      this.activeMenu === 'categories' ||
      this.activeMenu === 'subcategories' ||
      this.activeMenu === 'subscriptions' ||
      this.activeMenu === 'user-subscriptions' ||
      this.activeMenu === 'boost-plans' ||
      this.activeMenu === 'payments'
    );
  }

  get searchPlaceholder(): string {
    switch (this.activeMenu) {
      case 'users':
        return 'Search users by name, email, phone, role or status';
      case 'posts':
        return 'Search posts by title, category, subcategory, type or status';
      case 'categories':
        return 'Search categories by name, slug, type, sort order or status';
      case 'subcategories':
        return 'Search subcategories by name, category, slug, sort order or status';
      case 'subscriptions':
        return 'Search plans by name, description, price, validity or status';
      case 'user-subscriptions':
        return 'Search user subscriptions by user id, plan id, payment, ads or auth user id';
      case 'boost-plans':
        return 'Search boosts by boost name, plan id, user id, post id, price or duration';
      case 'payments':
        return 'Search payments by id, user id, auth user id, plan, amount, payment id, order id or status';
      default:
        return 'Search here...';
    }
  }
}