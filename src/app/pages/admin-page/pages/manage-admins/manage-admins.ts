import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../services/supabase.service';

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
  }

async loadAdmins() {
  const { data: adminsData, error: adminsError } =
    await this.supabaseService.supabase
      .from('admins')
      .select('*')
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

    return {
      ...admin,
      postCount
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
  alert(`Admin saved successfully. Sales ID: ${salesId}`);
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
}