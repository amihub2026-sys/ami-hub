import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.css']
})
export class AdminLogin {
  private supabaseService = inject(SupabaseService);

  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(private router: Router) {}

  async login() {
    this.errorMessage = '';
    this.isLoading = true;

    const { data, error } = await this.supabaseService.supabase
      .from('admins')
      .select(`
        adminid,
        adminname,
        adminemail,
        passwordhash,
        roleid,
        isactive
      `)
      .eq('adminemail', this.email.trim())
      .single();

    this.isLoading = false;

    if (error || !data) {
      this.errorMessage = 'Invalid admin email or password';
      return;
    }

    if (!data.isactive) {
      this.errorMessage = 'Admin account is inactive';
      return;
    }

    if (data.passwordhash !== this.password) {
      this.errorMessage = 'Invalid admin email or password';
      return;
    }
    if (!data.isactive) {
  this.errorMessage = 'This admin account has been deactivated.';
  return;
}

    const adminRole = data.roleid === 1 ? 'super' : 'post';

    localStorage.setItem('adminLogin', 'true');
    localStorage.setItem('adminRole', adminRole);
    localStorage.setItem('adminId', String(data.adminid));
    localStorage.setItem('adminEmail', data.adminemail);
    localStorage.setItem('adminName', data.adminname);

    this.router.navigate(['/admin']);
  }
}