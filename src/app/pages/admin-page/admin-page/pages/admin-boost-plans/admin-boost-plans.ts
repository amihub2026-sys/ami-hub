import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../../services/supabase.service';

interface AdminBoostPlanItem {
  boostid: number;
  userid: number | null;
  postid: number | null;
  boost_plan_id: string;
  boost_name: string;
  price: number;
  duration_days: number;
  startdate: string | null;
  enddate: string | null;
  isactive: boolean;
  createdon: string | null;

  startLabel: string;
  endLabel: string;
  createdLabel: string;
  statusLabel: 'Active' | 'Expired' | 'Inactive';
}

type BoostStatusFilter = 'all' | 'active' | 'expired' | 'inactive';

@Component({
  selector: 'app-admin-boost-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-boost-plans.html',
  styleUrls: ['./admin-boost-plans.css'],
})
export class AdminBoostPlansComponent implements OnInit {
  @Input() searchQuery = '';

  boostStatusFilter: BoostStatusFilter = 'all';

  allBoostPlans: AdminBoostPlanItem[] = [];
  loading = false;
  saving = false;
  deletingId: number | null = null;

  showForm = false;
  isEditMode = false;
  editingId: number | null = null;

  formModel = {
    userid: null as number | null,
    postid: null as number | null,
    boost_plan_id: '',
    boost_name: '',
    price: 0,
    duration_days: 1,
    startdate: '',
    enddate: '',
    isactive: true,
  };

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.fetchBoostPlans();
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

  private mapBoostPlan(item: any): AdminBoostPlanItem {
    return {
      boostid: Number(item.boostid ?? 0),
      userid:
        item.userid !== null && item.userid !== undefined
          ? Number(item.userid)
          : null,
      postid:
        item.postid !== null && item.postid !== undefined
          ? Number(item.postid)
          : null,
      boost_plan_id: item.boost_plan_id ?? '',
      boost_name: item.boost_name ?? '',
      price: Number(item.price ?? 0),
      duration_days: Number(item.duration_days ?? 0),
      startdate: item.startdate ?? null,
      enddate: item.enddate ?? null,
      isactive: !!item.isactive,
      createdon: item.createdon ?? null,
      startLabel: this.formatDate(item.startdate ?? null),
      endLabel: this.formatDate(item.enddate ?? null),
      createdLabel: this.formatDate(item.createdon ?? null),
      statusLabel: this.getStatusLabel({
        isactive: !!item.isactive,
        enddate: item.enddate ?? null,
      }),
    };
  }

  async fetchBoostPlans(): Promise<void> {
    this.loading = true;

    try {
      const { data, error } = await this.supabase
        .from('post_boosts')
        .select('*')
        .order('boostid', { ascending: false });

      if (error) {
        console.error('Fetch boost plans error:', error);
        alert(error.message || 'Failed to load boost plans.');
        return;
      }

      this.allBoostPlans = (data || []).map((item: any) =>
        this.mapBoostPlan(item)
      );
    } catch (err) {
      console.error('Fetch boost plans exception:', err);
      alert('Something went wrong while loading boost plans.');
    } finally {
      this.loading = false;
    }
  }

  setBoostStatusFilter(filter: BoostStatusFilter): void {
    this.boostStatusFilter = filter;
  }

  get filteredBoostPlans(): AdminBoostPlanItem[] {
    const q = (this.searchQuery || '').trim().toLowerCase();

    return this.allBoostPlans.filter((item) => {
      const matchesSearch =
        !q ||
        String(item.boostid).toLowerCase().includes(q) ||
        String(item.userid ?? '').toLowerCase().includes(q) ||
        String(item.postid ?? '').toLowerCase().includes(q) ||
        String(item.boost_plan_id || '').toLowerCase().includes(q) ||
        String(item.boost_name || '').toLowerCase().includes(q) ||
        String(item.price).toLowerCase().includes(q) ||
        String(item.duration_days).toLowerCase().includes(q);

      const matchesFilter =
        this.boostStatusFilter === 'all' ||
        (this.boostStatusFilter === 'active' &&
          item.statusLabel === 'Active') ||
        (this.boostStatusFilter === 'expired' &&
          item.statusLabel === 'Expired') ||
        (this.boostStatusFilter === 'inactive' &&
          item.statusLabel === 'Inactive');

      return matchesSearch && matchesFilter;
    });
  }

  get totalBoostPlansCount(): number {
    return this.allBoostPlans.length;
  }

  get activeBoostPlansCount(): number {
    return this.allBoostPlans.filter(
      (item) => item.statusLabel === 'Active'
    ).length;
  }

  get expiredBoostPlansCount(): number {
    return this.allBoostPlans.filter(
      (item) => item.statusLabel === 'Expired'
    ).length;
  }

  get inactiveBoostPlansCount(): number {
    return this.allBoostPlans.filter(
      (item) => item.statusLabel === 'Inactive'
    ).length;
  }

  openCreateForm(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.showForm = true;
    this.resetForm();
  }

  openEditForm(item: AdminBoostPlanItem): void {
    this.isEditMode = true;
    this.editingId = item.boostid;
    this.showForm = true;

    this.formModel = {
      userid: item.userid,
      postid: item.postid,
      boost_plan_id: item.boost_plan_id || '',
      boost_name: item.boost_name || '',
      price: Number(item.price || 0),
      duration_days: Number(item.duration_days || 1),
      startdate: this.toDateTimeLocal(item.startdate),
      enddate: this.toDateTimeLocal(item.enddate),
      isactive: !!item.isactive,
    };
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.editingId = null;
    this.resetForm();
  }

  resetForm(): void {
    this.formModel = {
      userid: null,
      postid: null,
      boost_plan_id: '',
      boost_name: '',
      price: 0,
      duration_days: 1,
      startdate: '',
      enddate: '',
      isactive: true,
    };
  }

  async saveBoostPlan(): Promise<void> {
    if (!this.formModel.userid) {
      alert('User ID is required.');
      return;
    }

    if (!this.formModel.postid) {
      alert('Post ID is required.');
      return;
    }

    if (!this.formModel.boost_plan_id.trim()) {
      alert('Boost Plan ID is required.');
      return;
    }

    if (!this.formModel.boost_name.trim()) {
      alert('Boost Name is required.');
      return;
    }

    if (!this.formModel.startdate) {
      alert('Start date is required.');
      return;
    }

    if (!this.formModel.enddate) {
      alert('End date is required.');
      return;
    }

    this.saving = true;

    const payload = {
      userid: this.formModel.userid,
      postid: this.formModel.postid,
      boost_plan_id: this.formModel.boost_plan_id.trim(),
      boost_name: this.formModel.boost_name.trim(),
      price: Number(this.formModel.price || 0),
      duration_days: Number(this.formModel.duration_days || 0),
      startdate: new Date(this.formModel.startdate).toISOString(),
      enddate: new Date(this.formModel.enddate).toISOString(),
      isactive: !!this.formModel.isactive,
    };

    try {
      if (this.isEditMode && this.editingId) {
        const { error } = await this.supabase
          .from('post_boosts')
          .update(payload)
          .eq('boostid', this.editingId);

        if (error) {
          console.error('Update boost plan error:', error);
          alert(error.message || 'Failed to update boost plan.');
          return;
        }

        alert('Boost plan updated successfully.');
      } else {
        const insertPayload = {
          ...payload,
          createdon: new Date().toISOString(),
        };

        const { error } = await this.supabase
          .from('post_boosts')
          .insert([insertPayload]);

        if (error) {
          console.error('Create boost plan error:', error);
          alert(error.message || 'Failed to create boost plan.');
          return;
        }

        alert('Boost plan created successfully.');
      }

      this.closeForm();
      await this.fetchBoostPlans();
    } catch (err) {
      console.error('Save boost plan exception:', err);
      alert('Something went wrong while saving boost plan.');
    } finally {
      this.saving = false;
    }
  }

  async toggleBoostStatus(item: AdminBoostPlanItem): Promise<void> {
    const nextValue = !item.isactive;

    try {
      const { error } = await this.supabase
        .from('post_boosts')
        .update({
          isactive: nextValue,
        })
        .eq('boostid', item.boostid);

      if (error) {
        console.error('Toggle boost status error:', error);
        alert(error.message || 'Failed to update status.');
        return;
      }

      item.isactive = nextValue;
      item.statusLabel = this.getStatusLabel({
        isactive: item.isactive,
        enddate: item.enddate,
      });
    } catch (err) {
      console.error('Toggle boost status exception:', err);
      alert('Something went wrong while updating status.');
    }
  }

  async deleteBoostPlan(item: AdminBoostPlanItem): Promise<void> {
    if (!item?.boostid) {
      alert('Invalid boost record.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete boost #${item.boostid}?\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    this.deletingId = item.boostid;

    try {
      const { error } = await this.supabase
        .from('post_boosts')
        .delete()
        .eq('boostid', item.boostid);

      if (error) {
        console.error('Delete boost plan error:', error);
        alert(error.message || 'Failed to delete boost plan.');
        return;
      }

      this.allBoostPlans = this.allBoostPlans.filter(
        (row) => row.boostid !== item.boostid
      );

      alert('Boost plan deleted successfully.');
    } catch (err) {
      console.error('Delete boost plan exception:', err);
      alert('Something went wrong while deleting boost plan.');
    } finally {
      this.deletingId = null;
    }
  }

  trackByBoostPlan(index: number, item: AdminBoostPlanItem): number {
    return item.boostid;
  }
}