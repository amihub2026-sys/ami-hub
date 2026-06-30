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
    role: 'post',
    status: true
  };

  async ngOnInit() {
    await this.loadAdmins();
  }

  
async loadAdmins() {
  const { data, error } = await this.supabaseService.supabase
    .from('admins')
    .select('*')
    .order('createdon', { ascending: false });

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  this.admins = data || [];
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

    const { error } = await this.supabaseService.supabase
      .from('admins')
      .insert({
        adminname: this.formData.name,
        adminemail: this.formData.email,
        phone: this.formData.phone,
        passwordhash: this.formData.password,
        roleid: roleId,
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
      role: 'post',
      status: true
    };

    this.showForm = false;
    alert('Admin saved successfully');
  }
async removeAdmin(adminid: number) {
  const confirmed = confirm('Remove this admin?');
  if (!confirmed) return;

  const { error } = await this.supabaseService.supabase
    .from('admins')
    .delete()
    .eq('adminid', adminid);

  if (error) {
    console.error('Remove admin error:', error);
    alert(error.message);
    return;
  }

  this.admins = this.admins.filter(admin => admin.adminid !== adminid);
  this.cdr.detectChanges();

  alert('Admin removed successfully');
}
}