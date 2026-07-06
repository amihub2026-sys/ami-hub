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
  *,
  admin_activity(
    login_time,
    logout_time,
    login_date,
    total_posts,
    total_users
  )
`)
    .eq('adminemail', this.email.trim())
    .single();

  this.isLoading = false;

  if (error || !data) {
    this.errorMessage = 'Invalid admin email or password';
    return;
  }

  if (!data.isactive) {
    this.errorMessage = 'This admin account has been deactivated.';
    return;
  }

  if (data.passwordhash !== this.password) {
    this.errorMessage = 'Invalid admin email or password';
    return;
  }
const now = new Date().toLocaleString('sv-SE', {
  timeZone: 'Asia/Kolkata'
});

const today = new Date().toLocaleDateString('en-CA', {
  timeZone: 'Asia/Kolkata'
});

const { data: activityData, error: activityError } =
  await this.supabaseService.supabase
    .from('admin_activity')
    .insert({
      admin_id: data.adminid,
      login_time: now,
      login_date: today,
      total_posts: 0,
      total_users: 0
    })
    .select('id')
    .single();

if (activityError) {
  console.error(activityError);
  alert(activityError.message);
  return;
}

localStorage.setItem('adminActivityId', String(activityData.id));
  // SAVE LOGIN TIME HERE
 const { error: loginUpdateError } = await this.supabaseService.supabase
  .from('admins')
  .update({
    last_login_at: new Date().toISOString()
  })
  .eq('adminid', data.adminid);

if (loginUpdateError) {
  console.error('Login time update error:', loginUpdateError);
  alert(loginUpdateError.message);
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