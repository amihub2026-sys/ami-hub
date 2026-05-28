import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../../services/supabase.service';

interface AdminUserBoostPlanItem {
  boost_purchase_id: string;
 userid: number | null;
  auth_user_id: string | null;
post_id: number | null;
  ad_type: string | null;
  boost_plan_id: string;
  boost_name: string | null;
  amount: number;
  paymentstatus: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  startdate: string | null;
  enddate: string | null;
  isactive: boolean;
  createdon: string | null;
  startLabel: string;
  endLabel: string;
  createdLabel: string;
  statusLabel: 'Active' | 'Expired' | 'Inactive';
}

@Component({
  selector: 'app-admin-user-boost-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-user-boost-plans.html',
  styleUrls: ['./admin-user-boost-plans.css'],
})
export class AdminUserBoostPlansComponent implements OnInit {
  @Input() searchQuery = '';

  currentPage = 1;
  itemsPerPage = 5;

  allUserBoostPlans: AdminUserBoostPlanItem[] = [];
  loading = false;

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchUserBoostPlans();
  }

  get supabase() {
    return this.supabaseService.supabase;
  }

  get filteredUserBoostPlans(): AdminUserBoostPlanItem[] {
    const q = this.searchQuery.trim().toLowerCase();

    if (!q) return this.allUserBoostPlans;

    return this.allUserBoostPlans.filter((item) =>
      String(item.userid ?? '').includes(q) ||
      String(item.auth_user_id ?? '').toLowerCase().includes(q) ||
      String(item.post_id ?? '').toLowerCase().includes(q)||
      String(item.ad_type ?? '').toLowerCase().includes(q) ||
      String(item.boost_plan_id ?? '').toLowerCase().includes(q) ||
      String(item.boost_name ?? '').toLowerCase().includes(q) ||
      String(item.paymentstatus ?? '').toLowerCase().includes(q)
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUserBoostPlans.length / this.itemsPerPage) || 1;
  }

  get paginatedUserBoostPlans(): AdminUserBoostPlanItem[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUserBoostPlans.slice(start, start + this.itemsPerPage);
  }

  async fetchUserBoostPlans(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();

    const { data, error } = await this.supabase
      .from('user_boost_purchases')
      .select('*')
      .order('createdon', { ascending: false });

   if (error) {
  console.error('Supabase fetch error:', error);
  alert(JSON.stringify(error));
  this.loading = false;
  this.cdr.detectChanges();
  return;
}

    this.allUserBoostPlans = (data || []).map((item: any) => ({
      boost_purchase_id: item.boost_purchase_id,
      userid: item.userid ?? null,
      auth_user_id: item.auth_user_id ?? null,
      post_id: item.post_id ?? null,
      ad_type: item.ad_type ?? null,
      boost_plan_id: item.boost_plan_id ?? '',
      boost_name: item.boost_name ?? null,
      amount: Number(item.amount ?? 0),
      paymentstatus: item.paymentstatus ?? null,
      razorpay_payment_id: item.razorpay_payment_id ?? null,
      razorpay_order_id: item.razorpay_order_id ?? null,
      startdate: item.startdate ?? null,
      enddate: item.enddate ?? null,
      isactive: !!item.isactive,
      createdon: item.createdon ?? null,
      startLabel: this.formatDate(item.startdate),
      endLabel: this.formatDate(item.enddate),
      createdLabel: this.formatDate(item.createdon),
      statusLabel: this.getStatusLabel(item.isactive, item.enddate),
    }));

    this.loading = false;


    this.cdr.detectChanges();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  trackByBoost(index: number, item: AdminUserBoostPlanItem): string {
    return item.boost_purchase_id;
  }

  private getStatusLabel(
    isactive: boolean,
    enddate: string | null
  ): 'Active' | 'Expired' | 'Inactive' {
    if (!isactive) return 'Inactive';
    if (!enddate) return 'Inactive';

    return new Date(enddate) >= new Date() ? 'Active' : 'Expired';
  }

  private formatDate(value: string | null): string {
    if (!value) return '-';

    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-IN');
  }
}