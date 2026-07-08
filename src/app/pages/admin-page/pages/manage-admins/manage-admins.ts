import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../services/supabase.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-manage-admins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-admins.html',
  styleUrls: ['./manage-admins.css']
})
export class ManageAdmins implements OnInit {

  private supabaseService = inject(SupabaseService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  showForm = false;
  admins: any[] = [];
  adminActivities: any[] = [];

  formData = {
    name: '',
    email: '',
    phone: '',
    password: '',
      salesId: '',
    role: 'post',
    status: true
  };

  async ngOnInit() {
    await this.loadAdmins();
     await this.loadDailyAdminActivity();
  }

async loadAdmins() {
  const { data: adminsData, error: adminsError } =
    await this.supabaseService.supabase
      .from('admins')
    .select(`
      *,
      admin_activity(
        login_time,
        logout_time,
        login_date
      )
    `)
      .eq('isactive', true)
      .order('createdon', { ascending: false });

  if (adminsError) {
    alert(adminsError.message);
    return;
  }

  const { data: postsData, error: postsError } =
    await this.supabaseService.supabase
      .from('post')
      .select('post_admin_id')
      .not('post_admin_id', 'is', null);

  if (postsError) {
    alert(postsError.message);
    return;
    
  }

  this.admins = (adminsData || []).map((admin: any) => {
    const postCount = (postsData || []).filter((post: any) =>
      Number(post.post_admin_id) === Number(admin.adminid)
    ).length;
const activities = admin.admin_activity || [];

const latestActivity = activities.length
  ? activities.sort((a: any, b: any) =>
      new Date(b.login_time).getTime() - new Date(a.login_time).getTime()
    )[0]
  : null;

return {
  ...admin,
  postCount,
  latestLogin: latestActivity?.login_time || null,
  latestLogout: latestActivity?.logout_time || null
};
  });

  this.cdr.detectChanges();
}
  
 openForm() {
  this.showForm = true;
}

  closeForm() {
    this.showForm = false;
  }
  

async saveAdmin() {
  const roleId = this.formData.role === 'super' ? 1 : 2;

  const { data: lastAdmin } = await this.supabaseService.supabase
    .from('admins')
    .select('sales_id')
    .not('sales_id', 'is', null)
    .order('adminid', { ascending: false })
    .limit(1)
    .maybeSingle();

  let salesId = '';
if (!this.formData.salesId.trim()) {
  alert('Please enter Sales ID');
  return;
}

  const { error } = await this.supabaseService.supabase
    .from('admins')
    .insert({
      adminname: this.formData.name,
      adminemail: this.formData.email,
      phone: this.formData.phone,
      passwordhash: this.formData.password,
      roleid: roleId,
       sales_id: this.formData.salesId.trim(),

      isactive: this.formData.status,
      createdon: new Date().toISOString()
    });

  if (error) {
    alert(error.message);
    return;
  }

  await this.loadAdmins();

  this.formData = {
    name: '',
    email: '',
    phone: '',
    password: '',
      salesId: '',
    role: 'post',
    status: true
  };

  this.showForm = false;
alert(`Admin saved successfully. Sales ID: ${this.formData.salesId}`);
}
async loadDailyAdminActivity() {
  const today = new Date();

  const firstDayOfMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  const lastDayOfMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  );

  const fromDate = firstDayOfMonth.toISOString().substring(0, 10);
  const toDate = lastDayOfMonth.toISOString().substring(0, 10);

  const { data, error } = await this.supabaseService.supabase
    .from('admin_activity')
    .select(`
      id,
      admin_id,
      login_time,
      logout_time,
      login_date,
      total_posts,
      total_users,
      admins (
        adminname,
        adminemail,
        sales_id,
        roleid
      )
    `)
    .gte('login_date', fromDate)
    .lte('login_date', toDate)
    .order('login_date', { ascending: false })
    .order('login_time', { ascending: false });

     if (error) {
    alert(error.message);
    return;
    }

   this.adminActivities = data || [];
   this.cdr.detectChanges();
  }
   async removeAdmin(adminid: number) {
   const ok = confirm('Do you want to deactivate this admin?');

  if (!ok) return;

   const { error } = await this.supabaseService.supabase
    .from('admins')
    .update({
      isactive: false
    })
    .eq('adminid', adminid);

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }
  

  await this.loadAdmins();

  alert('Admin deactivated successfully.');
}
formatDateTime(value: string | null): string {
  if (!value) return '-';

  const date = new Date(value);

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
exportAdminActivityExcel() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const lastDayOfMonth = new Date(year, month + 1, 0);
  const exportData: any[] = [];

  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const dateObj = new Date(year, month, day);
    const dateStr = dateObj.toISOString().substring(0, 10);

    const dayRecords = this.adminActivities.filter(
      (item: any) => item.login_date === dateStr
    );

      if (dayRecords.length) {
       dayRecords.forEach((item: any) => {
         exportData.push({
          'Sales ID': item.admins?.sales_id || '-',
          'Admin Name': item.admins?.adminname || '-',
          'Email': item.admins?.adminemail || '-',
          'Date': dateStr,
          'Login Time': item.login_time || '-',
          'Logout Time': item.logout_time || '-',
          'Total Posts': item.total_posts || 0,
          'Total Users': item.total_users || 0
        });
      });
    } else {
      exportData.push({
        'Sales ID': '-',
        'Admin Name': '-',
        'Email': '-',
        'Date': dateStr,
        'Login Time': '-',
        'Logout Time': '-',
        'Total Posts': 0,
        'Total Users': 0
      });
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Admin Activity');

  XLSX.writeFile(workbook, `admin-activity-${year}-${month + 1}.xlsx`);
}
}