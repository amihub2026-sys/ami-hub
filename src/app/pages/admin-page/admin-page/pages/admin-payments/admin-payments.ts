import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../../services/supabase.service';

interface AdminPaymentItem {
  id: number;
  plan_id: string;
  plan_name: string;
  amount: number;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  status: string;
  created_at: string | null;
  auth_user_id: string;
  userid: number | null;

  createdLabel: string;
  amountLabel: string;
  statusLabel: string;
}

type PaymentStatusFilter = 'all' | 'paid' | 'pending' | 'failed' | 'other';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-payments.html',
  styleUrls: ['./admin-payments.css'],
})
export class AdminPaymentsComponent implements OnInit {
  @Input() searchQuery = '';

  paymentStatusFilter: PaymentStatusFilter = 'all';

  allPayments: AdminPaymentItem[] = [];
  loading = false;
  saving = false;
  deletingId: number | null = null;

  showForm = false;
  isEditMode = false;
  editingId: number | null = null;

  formModel = {
    plan_id: '',
    plan_name: '',
    amount: 0,
    razorpay_payment_id: '',
    razorpay_order_id: '',
    razorpay_signature: '',
    status: 'paid',
    auth_user_id: '',
    userid: null as number | null,
  };

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchPayments();
  }

  get supabase() {
    return this.supabaseService.supabase;
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

  private formatAmount(value: number | null | undefined): string {
    const amount = Number(value ?? 0);
    return `₹${(amount / 100).toFixed(2)}`;
  }

  private normalizeStatus(value: string | null | undefined): string {
    const status = String(value ?? '').trim().toLowerCase();

    if (status === 'paid') return 'Paid';
    if (status === 'pending') return 'Pending';
    if (status === 'failed') return 'Failed';

    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }

  private mapPayment(item: any): AdminPaymentItem {
    const amount = Number(item.amount ?? 0);

    return {
      id: Number(item.id ?? 0),
      plan_id: item.plan_id ?? '',
      plan_name: item.plan_name ?? '',
      amount,
      razorpay_payment_id: item.razorpay_payment_id ?? '',
      razorpay_order_id: item.razorpay_order_id ?? '',
      razorpay_signature: item.razorpay_signature ?? '',
      status: item.status ?? '',
      created_at: item.created_at ?? null,
      auth_user_id: item.auth_user_id ?? '',
      userid:
        item.userid !== null && item.userid !== undefined
          ? Number(item.userid)
          : null,
      createdLabel: this.formatDate(item.created_at ?? null),
      amountLabel: this.formatAmount(amount),
      statusLabel: this.normalizeStatus(item.status),
    };
  }

  async fetchPayments(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Fetch payments error:', error);
        alert(error.message || 'Failed to load payments.');
        this.cdr.detectChanges();
        return;
      }

      this.allPayments = (data || []).map((item: any) => this.mapPayment(item));
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Fetch payments exception:', err);
      alert('Something went wrong while loading payments.');
      this.cdr.detectChanges();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  setPaymentStatusFilter(filter: PaymentStatusFilter): void {
    this.paymentStatusFilter = filter;
    this.cdr.detectChanges();
  }

  get filteredPayments(): AdminPaymentItem[] {
    const q = (this.searchQuery || '').trim().toLowerCase();

    return this.allPayments.filter((item) => {
      const matchesSearch =
        !q ||
        String(item.id).toLowerCase().includes(q) ||
        String(item.userid ?? '').toLowerCase().includes(q) ||
        String(item.auth_user_id || '').toLowerCase().includes(q) ||
        String(item.plan_id || '').toLowerCase().includes(q) ||
        String(item.plan_name || '').toLowerCase().includes(q) ||
        String(item.amount).toLowerCase().includes(q) ||
        String(item.razorpay_payment_id || '').toLowerCase().includes(q) ||
        String(item.razorpay_order_id || '').toLowerCase().includes(q) ||
        String(item.status || '').toLowerCase().includes(q);

      const normalized = (item.status || '').toLowerCase();

      const matchesFilter =
        this.paymentStatusFilter === 'all' ||
        (this.paymentStatusFilter === 'paid' && normalized === 'paid') ||
        (this.paymentStatusFilter === 'pending' && normalized === 'pending') ||
        (this.paymentStatusFilter === 'failed' && normalized === 'failed') ||
        (this.paymentStatusFilter === 'other' &&
          normalized !== 'paid' &&
          normalized !== 'pending' &&
          normalized !== 'failed');

      return matchesSearch && matchesFilter;
    });
  }

  get totalPaymentsCount(): number {
    return this.allPayments.length;
  }

  get paidPaymentsCount(): number {
    return this.allPayments.filter(
      (item) => (item.status || '').toLowerCase() === 'paid'
    ).length;
  }

  get pendingPaymentsCount(): number {
    return this.allPayments.filter(
      (item) => (item.status || '').toLowerCase() === 'pending'
    ).length;
  }

  get failedPaymentsCount(): number {
    return this.allPayments.filter(
      (item) => (item.status || '').toLowerCase() === 'failed'
    ).length;
  }

  get totalRevenueLabel(): string {
    const total = this.allPayments
      .filter((item) => (item.status || '').toLowerCase() === 'paid')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return `₹${(total / 100).toFixed(2)}`;
  }

  openCreateForm(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.showForm = true;
    this.resetForm();
    this.cdr.detectChanges();
  }

  openEditForm(item: AdminPaymentItem): void {
    this.isEditMode = true;
    this.editingId = item.id;
    this.showForm = true;

    this.formModel = {
      plan_id: item.plan_id || '',
      plan_name: item.plan_name || '',
      amount: Number(item.amount || 0),
      razorpay_payment_id: item.razorpay_payment_id || '',
      razorpay_order_id: item.razorpay_order_id || '',
      razorpay_signature: item.razorpay_signature || '',
      status: item.status || 'paid',
      auth_user_id: item.auth_user_id || '',
      userid: item.userid,
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
      plan_id: '',
      plan_name: '',
      amount: 0,
      razorpay_payment_id: '',
      razorpay_order_id: '',
      razorpay_signature: '',
      status: 'paid',
      auth_user_id: '',
      userid: null,
    };
    this.cdr.detectChanges();
  }

  async savePayment(): Promise<void> {
    if (!this.formModel.plan_id.trim()) {
      alert('Plan ID is required.');
      this.cdr.detectChanges();
      return;
    }

    if (!this.formModel.plan_name.trim()) {
      alert('Plan Name is required.');
      this.cdr.detectChanges();
      return;
    }

    if (!this.formModel.razorpay_payment_id.trim()) {
      alert('Razorpay Payment ID is required.');
      this.cdr.detectChanges();
      return;
    }

    if (!this.formModel.razorpay_order_id.trim()) {
      alert('Razorpay Order ID is required.');
      this.cdr.detectChanges();
      return;
    }

    if (!this.formModel.status.trim()) {
      alert('Status is required.');
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.cdr.detectChanges();

    const payload = {
      plan_id: this.formModel.plan_id.trim(),
      plan_name: this.formModel.plan_name.trim(),
      amount: Number(this.formModel.amount || 0),
      razorpay_payment_id: this.formModel.razorpay_payment_id.trim(),
      razorpay_order_id: this.formModel.razorpay_order_id.trim(),
      razorpay_signature: this.formModel.razorpay_signature.trim(),
      status: this.formModel.status.trim().toLowerCase(),
      auth_user_id: this.formModel.auth_user_id.trim() || null,
      userid: this.formModel.userid,
    };

    try {
      if (this.isEditMode && this.editingId) {
        const { error } = await this.supabase
          .from('payments')
          .update(payload)
          .eq('id', this.editingId);

        if (error) {
          console.error('Update payment error:', error);
          alert(error.message || 'Failed to update payment.');
          this.cdr.detectChanges();
          return;
        }

        alert('Payment updated successfully.');
      } else {
        const insertPayload = {
          ...payload,
          created_at: new Date().toISOString(),
        };

        const { error } = await this.supabase
          .from('payments')
          .insert([insertPayload]);

        if (error) {
          console.error('Create payment error:', error);
          alert(error.message || 'Failed to create payment.');
          this.cdr.detectChanges();
          return;
        }

        alert('Payment created successfully.');
      }

      this.closeForm();
      await this.fetchPayments();
    } catch (err) {
      console.error('Save payment exception:', err);
      alert('Something went wrong while saving payment.');
      this.cdr.detectChanges();
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  async updatePaymentStatus(
    item: AdminPaymentItem,
    nextStatus: 'paid' | 'pending' | 'failed'
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('payments')
        .update({ status: nextStatus })
        .eq('id', item.id);

      if (error) {
        console.error('Update payment status error:', error);
        alert(error.message || 'Failed to update payment status.');
        this.cdr.detectChanges();
        return;
      }

      item.status = nextStatus;
      item.statusLabel = this.normalizeStatus(nextStatus);
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Update payment status exception:', err);
      alert('Something went wrong while updating payment status.');
      this.cdr.detectChanges();
    }
  }

  async deletePayment(item: AdminPaymentItem): Promise<void> {
    if (!item?.id) {
      alert('Invalid payment record.');
      this.cdr.detectChanges();
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete payment #${item.id}?\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    this.deletingId = item.id;
    this.cdr.detectChanges();

    try {
      const { error } = await this.supabase
        .from('payments')
        .delete()
        .eq('id', item.id);

      if (error) {
        console.error('Delete payment error:', error);
        alert(error.message || 'Failed to delete payment.');
        this.cdr.detectChanges();
        return;
      }

      this.allPayments = this.allPayments.filter((row) => row.id !== item.id);
      alert('Payment deleted successfully.');
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Delete payment exception:', err);
      alert('Something went wrong while deleting payment.');
      this.cdr.detectChanges();
    } finally {
      this.deletingId = null;
      this.cdr.detectChanges();
    }
  }

  trackByPayment(index: number, item: AdminPaymentItem): number {
    return item.id;
  }
}