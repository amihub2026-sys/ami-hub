import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../../services/supabase.service';

interface AdminCategoryItem {
  categoryid: number;
  categoryname: string;
  slug: string;
  iconurl: string;
  bannerurl: string;
  sortorder: number;
  isactive: boolean;
  createdon: string;
  rawcreatedon: string;
  category_type: string;
}

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-categories.html',
  styleUrls: ['./admin-categories.css'],
})
export class AdminCategoriesComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  @Input() searchQuery = '';

  isLoading = true;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  categories: AdminCategoryItem[] = [];

  readonly iconBucket = 'category-icons';

  showForm = false;
  editingCategoryId: number | null = null;

  form = {
    categoryname: '',
    slug: '',
    iconurl: '',
    bannerurl: '',
    sortorder: 1,
    isactive: true,
    category_type: 'product',
  };

  selectedIconFile: File | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
  }

  async loadCategories(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabaseService.supabase
        .from('categories')
        .select(`
          categoryid,
          categoryname,
          slug,
          iconurl,
          bannerurl,
          sortorder,
          isactive,
          createdon,
          category_type
        `)
        .order('sortorder', { ascending: true })
        .order('createdon', { ascending: false });

      if (error) {
        console.error('Load categories error:', error);
        this.errorMessage = 'Failed to load categories.';
        this.categories = [];
        this.cdr.detectChanges();
        return;
      }

      this.categories = (data || []).map((row: any) => ({
        categoryid: Number(row.categoryid),
        categoryname: row.categoryname || '',
        slug: row.slug || '',
        iconurl: row.iconurl || '',
        bannerurl: row.bannerurl || '',
        sortorder: Number(row.sortorder || 0),
        isactive: !!row.isactive,
        createdon: this.formatDate(row.createdon),
        rawcreatedon: row.createdon || '',
        category_type: row.category_type || '-',
      }));

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Categories page error:', error);
      this.errorMessage = 'Something went wrong while loading categories.';
      this.categories = [];
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  get filteredCategories(): AdminCategoryItem[] {
    const q = this.searchQuery.trim().toLowerCase();

    if (!q) return this.categories;

    return this.categories.filter((item) =>
      String(item.categoryid).includes(q) ||
      item.categoryname.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q) ||
      item.category_type.toLowerCase().includes(q) ||
      String(item.sortorder).includes(q) ||
      (item.isactive ? 'active' : 'inactive').includes(q)
    );
  }

  get totalCategories(): number {
    return this.categories.length;
  }

  get activeCategories(): number {
    return this.categories.filter((c) => c.isactive).length;
  }

  get inactiveCategories(): number {
    return this.categories.filter((c) => !c.isactive).length;
  }

  get productCategories(): number {
    return this.categories.filter((c) => c.category_type === 'product').length;
  }

  openCreateForm(): void {
    this.showForm = true;
    this.editingCategoryId = null;
    this.successMessage = '';
    this.errorMessage = '';
    this.selectedIconFile = null;

    this.form = {
      categoryname: '',
      slug: '',
      iconurl: '',
      bannerurl: '',
      sortorder: this.categories.length + 1,
      isactive: true,
      category_type: 'product',
    };

    this.cdr.detectChanges();
  }

  editCategory(item: AdminCategoryItem): void {
    this.showForm = true;
    this.editingCategoryId = item.categoryid;
    this.successMessage = '';
    this.errorMessage = '';
    this.selectedIconFile = null;

    this.form = {
      categoryname: item.categoryname,
      slug: item.slug,
      iconurl: item.iconurl,
      bannerurl: item.bannerurl,
      sortorder: item.sortorder,
      isactive: item.isactive,
      category_type: item.category_type || 'product',
    };

    this.cdr.detectChanges();
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingCategoryId = null;
    this.selectedIconFile = null;
    this.cdr.detectChanges();
  }

  onCategoryNameChange(): void {
    if (!this.editingCategoryId) {
      this.form.slug = this.makeSlug(this.form.categoryname);
      this.cdr.detectChanges();
    }
  }

  onIconFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedIconFile = input.files?.[0] || null;
    this.cdr.detectChanges();
  }

  onBannerFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) return;

    this.form.bannerurl = URL.createObjectURL(file);
    this.cdr.detectChanges();
  }

  async saveCategory(): Promise<void> {
    if (this.isSaving) return;

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.categoryname.trim()) {
      this.errorMessage = 'Category name is required.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.form.slug.trim()) {
      this.errorMessage = 'Slug is required.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.form.category_type.trim()) {
      this.errorMessage = 'Category type is required.';
      this.cdr.detectChanges();
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      let iconurl = this.form.iconurl;

      if (this.selectedIconFile) {
        iconurl = await this.uploadFile(
          this.selectedIconFile,
          this.iconBucket,
          'icon'
        );
      }

      const payload = {
        categoryname: this.form.categoryname.trim(),
        slug: this.form.slug.trim(),
        iconurl,
        bannerurl: this.form.bannerurl?.trim() || null,
        sortorder: Number(this.form.sortorder || 0),
        isactive: this.form.isactive,
        category_type: this.form.category_type.trim(),
      };

      if (this.editingCategoryId) {
        const { error } = await this.supabaseService.supabase
          .from('categories')
          .update(payload)
          .eq('categoryid', this.editingCategoryId);

        if (error) {
          console.error('Update category error:', error);
          this.errorMessage = error.message || 'Failed to update category.';
          this.isSaving = false;
          this.cdr.detectChanges();
          return;
        }

        this.successMessage = 'Category updated successfully.';
      } else {
        const { error } = await this.supabaseService.supabase
          .from('categories')
          .insert([payload]);

        if (error) {
          console.error('Create category error:', error);
          this.errorMessage = error.message || 'Failed to create category.';
          this.isSaving = false;
          this.cdr.detectChanges();
          return;
        }

        this.successMessage = 'Category created successfully.';
      }

      this.isSaving = false;
      this.cdr.detectChanges();
      this.cancelForm();
      await this.loadCategories();
    } catch (error: any) {
      console.error('Save category exception FULL:', error);
      this.errorMessage = error?.message || 'Failed to save category.';
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async toggleCategoryStatus(item: AdminCategoryItem): Promise<void> {
    const nextValue = !item.isactive;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    try {
      const { error } = await this.supabaseService.supabase
        .from('categories')
        .update({ isactive: nextValue })
        .eq('categoryid', item.categoryid);

      if (error) {
        console.error('Toggle category status error:', error);
        this.errorMessage = error.message || 'Failed to update category status.';
        this.cdr.detectChanges();
        return;
      }

      item.isactive = nextValue;
      this.successMessage = `Category ${nextValue ? 'enabled' : 'disabled'} successfully.`;
      this.cdr.detectChanges();
      await this.loadCategories();
    } catch (error) {
      console.error('Toggle category status exception:', error);
      this.errorMessage = 'Failed to update category status.';
      this.cdr.detectChanges();
    }
  }

  async deleteCategory(item: AdminCategoryItem): Promise<void> {
    if (!item.isactive) {
      this.errorMessage = 'Category is already inactive.';
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    const confirmed = window.confirm(
      `Do you want to deactivate category "${item.categoryname}"?`
    );

    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    try {
      const { error } = await this.supabaseService.supabase
        .from('categories')
        .update({ isactive: false })
        .eq('categoryid', item.categoryid);

      if (error) {
        console.error('Deactivate category error:', error);
        this.errorMessage = error.message || 'Failed to deactivate category.';
        this.cdr.detectChanges();
        return;
      }

      item.isactive = false;
      this.successMessage = 'Category deactivated successfully.';
      this.cdr.detectChanges();
      await this.loadCategories();
    } catch (error) {
      console.error('Deactivate category exception:', error);
      this.errorMessage = 'Failed to deactivate category.';
      this.cdr.detectChanges();
    }
  }

  getStatusLabel(item: AdminCategoryItem): string {
    return item.isactive ? 'Active' : 'Inactive';
  }

  getStatusClass(item: AdminCategoryItem): string {
    return item.isactive ? 'status-active' : 'status-inactive';
  }

  trackByCategory(index: number, item: AdminCategoryItem): number {
    return item.categoryid;
  }

  private async uploadFile(
    file: File,
    bucket: string,
    prefix: string
  ): Promise<string> {
    if (!file) {
      throw new Error('No file selected.');
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const safePrefix = prefix.replace(/[^a-z0-9-_]/gi, '').toLowerCase();
    const fileName = `${safePrefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { data: uploadData, error: uploadError } =
      await this.supabaseService.supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

    if (uploadError) {
      throw new Error(
        uploadError.message || `Failed to upload file to ${bucket}.`
      );
    }

    const { data: publicUrlData } = this.supabaseService.supabase.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    if (!publicUrlData?.publicUrl) {
      throw new Error(`Failed to get public URL from ${bucket}.`);
    }

    return publicUrlData.publicUrl;
  }

  private makeSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
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