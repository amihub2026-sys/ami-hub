import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../../services/supabase.service';

interface AdminUserSubscriptionItem {
  usersubscriptionid: number;
  userid: number | null;
  subscriptionplanid: number | null;
  startdate: string | null;
  enddate: string | null;
  amountpaid: number;
  paymentstatus: string;
  isactive: boolean;
  createdon: string | null;
  total_ads: number;
  remaining_ads: number;
  plan_uuid: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_signature: string | null;
  auth_user_id: string | null;

  startLabel: string;
  endLabel: string;
  createdLabel: string;
  statusLabel: 'Active' | 'Expired' | 'Inactive';
}

type UserSubscriptionStatusFilter = 'all' | 'active' | 'expired' | 'inactive';

@Component({
  selector: 'app-admin-user-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-user-subscriptions.html',
  styleUrls: ['./admin-user-subscriptions.css'],
})
export class AdminUserSubscriptionsComponent implements OnInit {
  @Input() searchQuery = '';

  userSubscriptionStatusFilter: UserSubscriptionStatusFilter = 'all';

  allUserSubscriptions: AdminUserSubscriptionItem[] = [];
  loading = false;
  saving = false;
  deletingId: number | null = null;

  showForm = false;
  isEditMode = false;
  editingId: number | null = null;

  formModel = {
    userid: null as number | null,
    subscriptionplanid: null as number | null,
    startdate: '',
    enddate: '',
    amountpaid: 0,
    paymentstatus: 'paid',
    isactive: true,
    total_ads: 1,
    remaining_ads: 1,
    plan_uuid: '',
    razorpay_payment_id: '',
    razorpay_order_id: '',
    razorpay_signature: '',
    auth_user_id: '',
  };

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchUserSubscriptions();
  }

  get supabase() {
    return this.supabaseService.supabase;
  }

  private getStatusLabel(item: {
    isactive: boolean;
    enddate: string | null;
  }): 'Active' | 'Expired' | 'Inactive' {
    if (!item.isactive) return 'Inactive';
    if (!item.enddate) return 'Inactive';

    const end = new Date(item.enddate);
    const now = new Date();

    if (isNaN(end.getTime())) return 'Inactive';

    return end >= now ? 'Active' : 'Expired';
  }

  private formatDate(value: string | null): string {
    if (!value) return '-';

    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  private toDateTimeLocal(value: string | null): string {
    if (!value) return '';

    const date = new Date(value);
    if (isNaN(date.getTime())) return '';

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  private mapUserSubscription(item: any): AdminUserSubscriptionItem {
    const mapped: AdminUserSubscriptionItem = {
      usersubscriptionid: Number(item.usersubscriptionid ?? 0),
      userid: item.userid !== null && item.userid !== undefined ? Number(item.userid) : null,
      subscriptionplanid:
        item.subscriptionplanid !== null && item.subscriptionplanid !== undefined
          ? Number(item.subscriptionplanid)
          : null,
      startdate: item.startdate ?? null,
      enddate: item.enddate ?? null,
      amountpaid: Number(item.amountpaid ?? 0),
      paymentstatus: item.paymentstatus ?? '',
      isactive: !!item.isactive,
      createdon: item.createdon ?? null,
      total_ads: Number(item.total_ads ?? 0),
      remaining_ads: Number(item.remaining_ads ?? 0),
      plan_uuid: item.plan_uuid ?? null,
      razorpay_payment_id: item.razorpay_payment_id ?? null,
      razorpay_order_id: item.razorpay_order_id ?? null,
      razorpay_signature: item.razorpay_signature ?? null,
      auth_user_id: item.auth_user_id ?? null,
      startLabel: this.formatDate(item.startdate ?? null),
      endLabel: this.formatDate(item.enddate ?? null),
      createdLabel: this.formatDate(item.createdon ?? null),
      statusLabel: this.getStatusLabel({
        isactive: !!item.isactive,
        enddate: item.enddate ?? null,
      }),
    };

    return mapped;
  }

  async fetchUserSubscriptions(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabase
        .from('user_subscriptions')
        .select('*')
        .order('usersubscriptionid', { ascending: false });

      if (error) {
        console.error('Fetch user subscriptions error:', error);
        alert(error.message || 'Failed to load user subscriptions.');
        this.cdr.detectChanges();
        return;
      }

      this.allUserSubscriptions = (data || []).map((item: any) =>
        this.mapUserSubscription(item)
      );
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Fetch user subscriptions exception:', err);
      alert('Something went wrong while loading user subscriptions.');
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  setUserSubscriptionStatusFilter(filter: UserSubscriptionStatusFilter): void {
    this.userSubscriptionStatusFilter = filter;
    this.cdr.detectChanges();
  }

  get filteredUserSubscriptions(): AdminUserSubscriptionItem[] {
    const q = this.searchQuery.trim().toLowerCase();

    return this.allUserSubscriptions.filter((item) => {
      const matchesSearch =
        !q ||
        String(item.usersubscriptionid).toLowerCase().includes(q) ||
        String(item.userid ?? '').toLowerCase().includes(q) ||
        String(item.subscriptionplanid ?? '').toLowerCase().includes(q) ||
        String(item.paymentstatus || '').toLowerCase().includes(q) ||
        String(item.amountpaid).toLowerCase().includes(q) ||
        String(item.total_ads).toLowerCase().includes(q) ||
        String(item.remaining_ads).toLowerCase().includes(q) ||
        String(item.auth_user_id || '').toLowerCase().includes(q) ||
        String(item.plan_uuid || '').toLowerCase().includes(q) ||
        String(item.razorpay_payment_id || '').toLowerCase().includes(q) ||
        String(item.razorpay_order_id || '').toLowerCase().includes(q);

      const matchesFilter =
        this.userSubscriptionStatusFilter === 'all' ||
        (this.userSubscriptionStatusFilter === 'active' &&
          item.statusLabel === 'Active') ||
        (this.userSubscriptionStatusFilter === 'expired' &&
          item.statusLabel === 'Expired') ||
        (this.userSubscriptionStatusFilter === 'inactive' &&
          item.statusLabel === 'Inactive');

      return matchesSearch && matchesFilter;
    });
  }

  get totalUserSubscriptionsCount(): number {
    return this.allUserSubscriptions.length;
  }

  get activeUserSubscriptionsCount(): number {
    return this.allUserSubscriptions.filter(
      (item) => item.statusLabel === 'Active'
    ).length;
  }

  get expiredUserSubscriptionsCount(): number {
    return this.allUserSubscriptions.filter(
      (item) => item.statusLabel === 'Expired'
    ).length;
  }

  get inactiveUserSubscriptionsCount(): number {
    return this.allUserSubscriptions.filter(
      (item) => item.statusLabel === 'Inactive'
    ).length;
  }

  openCreateForm(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.showForm = true;
    this.resetForm();
    this.cdr.detectChanges();
  }

  openEditForm(item: AdminUserSubscriptionItem): void {
    this.isEditMode = true;
    this.editingId = item.usersubscriptionid;
    this.showForm = true;

    this.formModel = {
      userid: item.userid,
      subscriptionplanid: item.subscriptionplanid,
      startdate: this.toDateTimeLocal(item.startdate),
      enddate: this.toDateTimeLocal(item.enddate),
      amountpaid: Number(item.amountpaid || 0),
      paymentstatus: item.paymentstatus || 'paid',
      isactive: !!item.isactive,
      total_ads: Number(item.total_ads || 0),
      remaining_ads: Number(item.remaining_ads || 0),
      plan_uuid: item.plan_uuid || '',
      razorpay_payment_id: item.razorpay_payment_id || '',
      razorpay_order_id: item.razorpay_order_id || '',
      razorpay_signature: item.razorpay_signature || '',
      auth_user_id: item.auth_user_id || '',
    };

    this.cdr.detectChanges();
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.editingId = null;
    this.resetForm();
    this.cdr.detectChanges();
  }

  resetForm(): void {
    this.formModel = {
      userid: null,
      subscriptionplanid: null,
      startdate: '',
      enddate: '',
      amountpaid: 0,
      paymentstatus: 'paid',
      isactive: true,
      total_ads: 1,
      remaining_ads: 1,
      plan_uuid: '',
      razorpay_payment_id: '',
      razorpay_order_id: '',
      razorpay_signature: '',
      auth_user_id: '',
    };
    this.cdr.detectChanges();
  }

  async saveUserSubscription(): Promise<void> {
    if (!this.formModel.userid) {
      alert('User ID is required.');
      this.cdr.detectChanges();
      return;
    }

    if (!this.formModel.subscriptionplanid) {
      alert('Subscription Plan ID is required.');
      this.cdr.detectChanges();
      return;
    }

    if (!this.formModel.startdate) {
      alert('Start date is required.');
      this.cdr.detectChanges();
      return;
    }

    if (!this.formModel.enddate) {
      alert('End date is required.');
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.cdr.detectChanges();

    const payload = {
      userid: this.formModel.userid,
      subscriptionplanid: this.formModel.subscriptionplanid,
      startdate: new Date(this.formModel.startdate).toISOString(),
      enddate: new Date(this.formModel.enddate).toISOString(),
      amountpaid: Number(this.formModel.amountpaid || 0),
      paymentstatus: this.formModel.paymentstatus.trim(),
      isactive: !!this.formModel.isactive,
      total_ads: Number(this.formModel.total_ads || 0),
      remaining_ads: Number(this.formModel.remaining_ads || 0),
      plan_uuid: this.formModel.plan_uuid.trim() || null,
      razorpay_payment_id: this.formModel.razorpay_payment_id.trim() || null,
      razorpay_order_id: this.formModel.razorpay_order_id.trim() || null,
      razorpay_signature: this.formModel.razorpay_signature.trim() || null,
      auth_user_id: this.formModel.auth_user_id.trim() || null,
    };

    try {
      if (this.isEditMode && this.editingId) {
        const { error } = await this.supabase
          .from('user_subscriptions')
          .update(payload)
          .eq('usersubscriptionid', this.editingId);

        if (error) {
          console.error('Update user subscription error:', error);
          alert(error.message || 'Failed to update user subscription.');
          this.cdr.detectChanges();
          return;
        }

        alert('User subscription updated successfully.');
      } else {
        const insertPayload = {
          ...payload,
          createdon: new Date().toISOString(),
        };

        const { error } = await this.supabase
          .from('user_subscriptions')
          .insert([insertPayload]);

        if (error) {
          console.error('Create user subscription error:', error);
          alert(error.message || 'Failed to create user subscription.');
          this.cdr.detectChanges();
          return;
        }

        alert('User subscription created successfully.');
      }

      this.closeForm();
      await this.fetchUserSubscriptions();
    } catch (err) {
      console.error('Save user subscription exception:', err);
      alert('Something went wrong while saving user subscription.');
      this.cdr.detectChanges();
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  async toggleUserSubscriptionStatus(item: AdminUserSubscriptionItem): Promise<void> {
    const nextValue = !item.isactive;

    try {
      const { error } = await this.supabase
        .from('user_subscriptions')
        .update({
          isactive: nextValue,
        })
        .eq('usersubscriptionid', item.usersubscriptionid);

      if (error) {
        console.error('Toggle user subscription status error:', error);
        alert(error.message || 'Failed to update status.');
        this.cdr.detectChanges();
        return;
      }

      item.isactive = nextValue;
      item.statusLabel = this.getStatusLabel({
        isactive: item.isactive,
        enddate: item.enddate,
      });
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Toggle user subscription status exception:', err);
      alert('Something went wrong while updating status.');
      this.cdr.detectChanges();
    }
  }

  async deleteUserSubscription(item: AdminUserSubscriptionItem): Promise<void> {
    const confirmed = confirm(
      `Are you sure you want to delete subscription #${item.usersubscriptionid}?`
    );

    if (!confirmed) return;

    this.deletingId = item.usersubscriptionid;
    this.cdr.detectChanges();

    try {
      const { error } = await this.supabase
        .from('user_subscriptions')
        .delete()
        .eq('usersubscriptionid', item.usersubscriptionid);

      if (error) {
        console.error('Delete user subscription error:', error);
        alert(error.message || 'Failed to delete user subscription.');
        this.cdr.detectChanges();
        return;
      }

      this.allUserSubscriptions = this.allUserSubscriptions.filter(
        (row) => row.usersubscriptionid !== item.usersubscriptionid
      );

      alert('User subscription deleted successfully.');
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Delete user subscription exception:', err);
      alert('Something went wrong while deleting user subscription.');
      this.cdr.detectChanges();
    } finally {
      this.deletingId = null;
      this.cdr.detectChanges();
    }
  }

  trackByUserSubscription(index: number, item: AdminUserSubscriptionItem): number {
    return item.usersubscriptionid;
  }
}