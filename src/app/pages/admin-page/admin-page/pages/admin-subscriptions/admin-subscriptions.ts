import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../../services/supabase.service';

interface AdminSubscriptionPlanItem {
  subscriptionplanid: number;
  planname: string;
  description: string;
  price: number;
  validitydays: number;
  postlimit: number;
  isactive: boolean;
  createdon: string | null;
  createdLabel: string;
  plan_id: string;
  name: string;
  ad_limit: number;
  video_enabled: boolean;
  is_active: boolean;
  created_at: string | null;
  remaining_ads: number;
}

type SubscriptionStatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-subscriptions.html',
  styleUrls: ['./admin-subscriptions.css'],
})
export class AdminSubscriptionsComponent implements OnInit {
  @Input() searchQuery = '';

  subscriptionStatusFilter: SubscriptionStatusFilter = 'all';

  allSubscriptionPlans: AdminSubscriptionPlanItem[] = [];
  loading = false;
  saving = false;
  deletingId: number | null = null;

  showForm = false;
  isEditMode = false;
  editingPlanId: number | null = null;

  formModel = {
    planname: '',
    description: '',
    price: 0,
    validitydays: 30,
    postlimit: 1,
    isactive: true,
    plan_id: '',
    name: '',
    ad_limit: 1,
    video_enabled: false,
    is_active: true,
    remaining_ads: 1,
  };

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.fetchSubscriptionPlans();
  }

  get supabase() {
    return this.supabaseService.supabase;
  }

  async fetchSubscriptionPlans(): Promise<void> {
    this.loading = true;

    try {
      const { data, error } = await this.supabase
        .from('subscription_plans')
        .select('*')
        .order('subscriptionplanid', { ascending: false });

      if (error) {
        console.error('Fetch subscription plans error:', error);
        alert(error.message || 'Failed to load subscription plans.');
        return;
      }

      this.allSubscriptionPlans = (data || []).map((item: any) =>
        this.mapSubscriptionPlan(item)
      );
    } catch (err) {
      console.error('Fetch subscription plans exception:', err);
      alert('Something went wrong while loading subscription plans.');
    } finally {
      this.loading = false;
    }
  }

  mapSubscriptionPlan(item: any): AdminSubscriptionPlanItem {
    const createdSource = item.createdon || item.created_at || null;

    return {
      subscriptionplanid: Number(item.subscriptionplanid ?? 0),
      planname: item.planname ?? item.name ?? '',
      description: item.description ?? '',
      price: Number(item.price ?? 0),
      validitydays: Number(item.validitydays ?? 0),
      postlimit: Number(item.postlimit ?? item.ad_limit ?? 0),
      isactive: !!item.isactive,
      createdon: item.createdon ?? null,
      createdLabel: this.formatDate(createdSource),
      plan_id: item.plan_id ?? '',
      name: item.name ?? item.planname ?? '',
      ad_limit: Number(item.ad_limit ?? item.postlimit ?? 0),
      video_enabled: !!item.video_enabled,
      is_active: !!item.is_active,
      created_at: item.created_at ?? null,
      remaining_ads: Number(
        item.remaining_ads ?? item.ad_limit ?? item.postlimit ?? 0
      ),
    };
  }

  formatDate(value: string | null): string {
    if (!value) return '-';

    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  setSubscriptionStatusFilter(filter: SubscriptionStatusFilter): void {
    this.subscriptionStatusFilter = filter;
  }

  get filteredSubscriptionPlans(): AdminSubscriptionPlanItem[] {
    const q = this.searchQuery.trim().toLowerCase();

    return this.allSubscriptionPlans.filter((plan) => {
      const matchesSearch =
        !q ||
        String(plan.subscriptionplanid).toLowerCase().includes(q) ||
        String(plan.planname || '').toLowerCase().includes(q) ||
        String(plan.description || '').toLowerCase().includes(q) ||
        String(plan.plan_id || '').toLowerCase().includes(q) ||
        String(plan.name || '').toLowerCase().includes(q) ||
        String(plan.price).toLowerCase().includes(q) ||
        String(plan.validitydays).toLowerCase().includes(q) ||
        String(plan.postlimit).toLowerCase().includes(q) ||
        String(plan.ad_limit).toLowerCase().includes(q) ||
        String(plan.remaining_ads).toLowerCase().includes(q);

      const isPlanActive = plan.isactive && plan.is_active;

      const matchesFilter =
        this.subscriptionStatusFilter === 'all' ||
        (this.subscriptionStatusFilter === 'active' && isPlanActive) ||
        (this.subscriptionStatusFilter === 'inactive' && !isPlanActive);

      return matchesSearch && matchesFilter;
    });
  }

  get totalSubscriptionPlansCount(): number {
    return this.allSubscriptionPlans.length;
  }

  get activeSubscriptionPlansCount(): number {
    return this.allSubscriptionPlans.filter(
      (plan) => plan.isactive && plan.is_active
    ).length;
  }

  get inactiveSubscriptionPlansCount(): number {
    return this.allSubscriptionPlans.filter(
      (plan) => !(plan.isactive && plan.is_active)
    ).length;
  }

  get videoEnabledPlansCount(): number {
    return this.allSubscriptionPlans.filter((plan) => plan.video_enabled).length;
  }

  openCreateForm(): void {
    this.isEditMode = false;
    this.editingPlanId = null;
    this.showForm = true;
    this.resetForm();
  }

  openEditForm(plan: AdminSubscriptionPlanItem): void {
    this.isEditMode = true;
    this.editingPlanId = plan.subscriptionplanid;
    this.showForm = true;

    this.formModel = {
      planname: plan.planname || '',
      description: plan.description || '',
      price: Number(plan.price || 0),
      validitydays: Number(plan.validitydays || 0),
      postlimit: Number(plan.postlimit || 0),
      isactive: !!plan.isactive,
      plan_id: plan.plan_id || '',
      name: plan.name || '',
      ad_limit: Number(plan.ad_limit || 0),
      video_enabled: !!plan.video_enabled,
      is_active: !!plan.is_active,
      remaining_ads: Number(plan.remaining_ads || 0),
    };
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.editingPlanId = null;
    this.resetForm();
  }

  resetForm(): void {
    this.formModel = {
      planname: '',
      description: '',
      price: 0,
      validitydays: 30,
      postlimit: 1,
      isactive: true,
      plan_id: '',
      name: '',
      ad_limit: 1,
      video_enabled: false,
      is_active: true,
      remaining_ads: 1,
    };
  }

  async saveSubscription(): Promise<void> {
    if (!this.formModel.planname.trim()) {
      alert('Plan name is required.');
      return;
    }

    if (!this.formModel.plan_id.trim()) {
      alert('Plan ID is required.');
      return;
    }

    this.saving = true;

    const payload = {
      planname: this.formModel.planname.trim(),
      description: this.formModel.description.trim(),
      price: Number(this.formModel.price || 0),
      validitydays: Number(this.formModel.validitydays || 0),
      postlimit: Number(this.formModel.postlimit || 0),
      isactive: !!this.formModel.isactive,
      plan_id: this.formModel.plan_id.trim(),
      name: (this.formModel.name || this.formModel.planname).trim(),
      ad_limit: Number(this.formModel.ad_limit || 0),
      video_enabled: !!this.formModel.video_enabled,
      is_active: !!this.formModel.is_active,
      remaining_ads: Number(this.formModel.remaining_ads || 0),
    };

    try {
      if (this.isEditMode && this.editingPlanId) {
        const { error } = await this.supabase
          .from('subscription_plans')
          .update(payload)
          .eq('subscriptionplanid', this.editingPlanId);

        if (error) {
          console.error('Update subscription plan error:', error);
          alert(error.message || 'Failed to update subscription plan.');
          return;
        }

        alert('Subscription plan updated successfully.');
      } else {
        const now = new Date().toISOString();

        const insertPayload = {
          ...payload,
          createdon: now,
          created_at: now,
        };

        const { error } = await this.supabase
          .from('subscription_plans')
          .insert([insertPayload]);

        if (error) {
          console.error('Create subscription plan error:', error);
          alert(error.message || 'Failed to create subscription plan.');
          return;
        }

        alert('Subscription plan created successfully.');
      }

      this.closeForm();
      await this.fetchSubscriptionPlans();
    } catch (err) {
      console.error('Save subscription plan exception:', err);
      alert('Something went wrong while saving subscription plan.');
    } finally {
      this.saving = false;
    }
  }

  async toggleSubscriptionStatus(plan: AdminSubscriptionPlanItem): Promise<void> {
    const nextValue = !(plan.isactive && plan.is_active);

    try {
      const { error } = await this.supabase
        .from('subscription_plans')
        .update({
          isactive: nextValue,
          is_active: nextValue,
        })
        .eq('subscriptionplanid', plan.subscriptionplanid);

      if (error) {
        console.error('Toggle subscription status error:', error);
        alert(error.message || 'Failed to update status.');
        return;
      }

      plan.isactive = nextValue;
      plan.is_active = nextValue;
    } catch (err) {
      console.error('Toggle subscription status exception:', err);
      alert('Something went wrong while updating status.');
    }
  }

  async deleteSubscription(plan: AdminSubscriptionPlanItem): Promise<void> {
    const confirmed = confirm(
      `Are you sure you want to delete "${plan.planname}"?`
    );

    if (!confirmed) return;

    this.deletingId = plan.subscriptionplanid;

    try {
      const { error } = await this.supabase
        .from('subscription_plans')
        .delete()
        .eq('subscriptionplanid', plan.subscriptionplanid);

      if (error) {
        console.error('Delete subscription plan error:', error);
        alert(error.message || 'Failed to delete subscription plan.');
        return;
      }

      this.allSubscriptionPlans = this.allSubscriptionPlans.filter(
        (item) => item.subscriptionplanid !== plan.subscriptionplanid
      );

      alert('Subscription plan deleted successfully.');
    } catch (err) {
      console.error('Delete subscription plan exception:', err);
      alert('Something went wrong while deleting subscription plan.');
    } finally {
      this.deletingId = null;
    }
  }

  trackBySubscription(index: number, plan: AdminSubscriptionPlanItem): number {
    return plan.subscriptionplanid;
  }
}