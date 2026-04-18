import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-account-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-setup.html',
  styleUrls: ['./account-setup.css']
})
export class AccountSetup implements OnInit {
  password = '';
  confirmPassword = '';

  userType: '' | 'buyer' | 'seller' | 'both' = '';
  listingType: '' | 'product' | 'service' = '';

  isSubmitting = false;
  currentUser: any = null;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit() {
    const userId = localStorage.getItem('userId');

    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    const { data, error } = await this.supabaseService.getUserById(Number(userId));

    if (error || !data) {
      alert('User not found');
      this.router.navigate(['/login']);
      return;
    }

    this.currentUser = data;

    if (data.isonboardingcompleted === true) {
      this.router.navigate(['/']);
      return;
    }

    this.userType = this.mapUserTypeFromDb(data.usertypeid);
    this.listingType = data.listingtype || '';
  }

  private mapUserTypeFromDb(usertypeid: any): '' | 'buyer' | 'seller' | 'both' {
    const id = Number(usertypeid);

    if (id === 1) return 'buyer';
    if (id === 2) return 'seller';
    if (id === 4) return 'both';

    return '';
  }

  private mapUserTypeToDb(userType: string): number {
    if (userType === 'buyer') return 1;
    if (userType === 'seller') return 2;
    if (userType === 'both') return 4;

    return 1;
  }

  async submitSetup() {
    if (this.isSubmitting) return;

    if (!this.userType) {
      alert('Please select user type');
      return;
    }

    if (this.password && this.password !== this.confirmPassword) {
      alert('Password and confirm password do not match');
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.isSubmitting = true;

    try {
      const payload: any = {
        userid: Number(userId),
        usertypeid: this.mapUserTypeToDb(this.userType),
        listingtype: this.listingType || null,
        isonboardingcompleted: true
      };

      if (this.password) {
        payload.password = this.password;
      }

      const updatedUser = await this.supabaseService.updateUserOnboarding(payload);

      localStorage.setItem('userTypeId', String(updatedUser.usertypeid || ''));
      alert('Account setup completed');
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error saving onboarding:', error);
      alert('Failed to save account setup');
    } finally {
      this.isSubmitting = false;
    }
  }
}