import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  inject,
} from '@angular/core';
import { SupabaseService } from '../../../../../services/supabase.service';

type UserStatus = 'Active' | 'Blocked' | 'Pending';

interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: UserStatus;
  joinedOn: string;
  avatar: string;
  isactive: boolean;
  isverified: boolean;
  termsaccepted: boolean;
  isonboardingcompleted: boolean;
  usertypeid: number | null;
  createdonRaw: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.css'],
})
export class AdminUsers implements OnInit {
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  @Input() searchQuery = '';

  isLoading = true;
  errorMessage = '';
  users: AdminUserItem[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabaseService.supabase
        .from('users')
        .select(`
          userid,
          fullname,
          name,
          email,
          phonenumber,
          phone_number,
          profileimageurl,
          avatar_url,
          usertypeid,
          isverified,
          isactive,
          createdon,
          termsaccepted,
          isonboardingcompleted
        `)
        .order('createdon', { ascending: false });

      if (error) {
        console.error('Load users error:', error);
        this.errorMessage = 'Failed to load users.';
        this.users = [];
        this.cdr.detectChanges();
        return;
      }

      this.users = (data || []).map((row: any) => {
        const resolvedName =
          row.fullname?.trim() ||
          row.name?.trim() ||
          row.email?.split('@')?.[0] ||
          'User';

        const resolvedPhone =
          row.phonenumber?.trim() ||
          row.phone_number?.trim() ||
          '-';

        const resolvedStatus = this.getStatusFromRow(row);

        return {
          id: Number(row.userid),
          name: resolvedName,
          email: row.email || '-',
          phone: resolvedPhone,
          role: this.getRoleLabel(row.usertypeid),
          status: resolvedStatus,
          joinedOn: this.formatDate(row.createdon),
          avatar: (resolvedName || 'U').charAt(0).toUpperCase(),
          isactive: !!row.isactive,
          isverified: !!row.isverified,
          termsaccepted: !!row.termsaccepted,
          isonboardingcompleted: !!row.isonboardingcompleted,
          usertypeid: row.usertypeid ?? null,
          createdonRaw: row.createdon || '',
        };
      });

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Users page error:', error);
      this.errorMessage = 'Something went wrong while loading users.';
      this.users = [];
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  get filteredUsers(): AdminUserItem[] {
    const q = this.searchQuery.trim().toLowerCase();

    if (!q) return this.users;

    return this.users.filter((user) =>
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.phone.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q) ||
      String(user.id).includes(q) ||
      user.status.toLowerCase().includes(q)
    );
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get activeUsers(): number {
    return this.users.filter((u) => u.status === 'Active').length;
  }

  get blockedUsers(): number {
    return this.users.filter((u) => u.status === 'Blocked').length;
  }

  get pendingUsers(): number {
    return this.users.filter((u) => u.status === 'Pending').length;
  }

  async toggleStatus(user: AdminUserItem): Promise<void> {
    const nextIsActive = user.status !== 'Active';

    const previousStatus = user.status;
    const previousIsActive = user.isactive;

    user.isactive = nextIsActive;
    user.status = nextIsActive ? 'Active' : 'Blocked';
    this.cdr.detectChanges();

    try {
      const { error } = await this.supabaseService.supabase
        .from('users')
        .update({
          isactive: nextIsActive,
          updatedon: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('userid', user.id);

      if (error) {
        console.error('Toggle user status error:', error);
        user.isactive = previousIsActive;
        user.status = previousStatus;
        this.errorMessage = 'Failed to update user status.';
      }
    } catch (error) {
      console.error('Toggle user status exception:', error);
      user.isactive = previousIsActive;
      user.status = previousStatus;
      this.errorMessage = 'Failed to update user status.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  getActionLabel(user: AdminUserItem): string {
    return user.status === 'Active' ? 'Block' : 'Activate';
  }

  trackByUser(index: number, user: AdminUserItem): number {
    return user.id;
  }

  private getRoleLabel(usertypeid: number | null): string {
    switch (Number(usertypeid)) {
      case 1:
        return 'User';
      case 2:
        return 'Seller';
      case 3:
        return 'Vendor';
      case 4:
        return 'Admin';
      default:
        return 'User';
    }
  }

  private getStatusFromRow(row: any): UserStatus {
    if (row.isactive) {
      return 'Active';
    }

    if (!row.termsaccepted || !row.isonboardingcompleted) {
      return 'Pending';
    }

    return 'Blocked';
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) return '-';

    const date = new Date(value);

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}