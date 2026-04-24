import { Component, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../../services/supabase.service';

interface AdminSubcategoryItem {
  subcategoryid: number;
  categoryid: number;
  categoryname: string;
  subcategoryname: string;
  slug: string;
  iconurl: string;
  image: string;
  sortorder: number;
  isactive: boolean;
  createdon: string | null;
  createdLabel: string;
}

interface CategoryOption {
  categoryid: number;
  categoryname: string;
  isactive: boolean;
}

type SubcategoryStatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-admin-subcategories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-subcategories.html',
  styleUrls: ['./admin-subcategories.css'],
})
export class AdminSubcategories implements OnInit {
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  @Input() searchQuery = '';

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  subcategoryStatusFilter: SubcategoryStatusFilter = 'all';

  allSubcategories: AdminSubcategoryItem[] = [];
  categories: CategoryOption[] = [];

  showForm = false;
  editingSubcategoryId: number | null = null;

  readonly mediaBucket = 'subcategory-media';

  selectedIconFile: File | null = null;
  selectedImageFile: File | null = null;

  form = {
    categoryid: null as number | null,
    subcategoryname: '',
    slug: '',
    iconurl: '',
    image: '',
    sortorder: 1,
    isactive: true,
  };

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadCategories(), this.loadSubcategories()]);
  }

  async loadCategories(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('categories')
        .select('categoryid, categoryname, isactive')
        .order('sortorder', { ascending: true })
        .order('categoryname', { ascending: true });

      if (error) {
        console.error('Load categories error:', error);
        this.cdr.detectChanges();
        return;
      }

      this.categories = (data || []).map((row: any) => ({
        categoryid: Number(row.categoryid),
        categoryname: row.categoryname || '',
        isactive: !!row.isactive,
      }));

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Load categories exception:', error);
      this.cdr.detectChanges();
    }
  }

  async loadSubcategories(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabaseService.supabase
        .from('subcategories')
        .select(`
          subcategoryid,
          categoryid,
          subcategoryname,
          slug,
          iconurl,
          isactive,
          createdon,
          image,
          sortorder,
          categories (
            categoryname
          )
        `)
        .order('sortorder', { ascending: true })
        .order('createdon', { ascending: false });

      if (error) {
        console.error('Load subcategories error:', error);
        this.errorMessage = error.message || 'Failed to load subcategories.';
        this.allSubcategories = [];
        this.cdr.detectChanges();
        return;
      }

      this.allSubcategories = (data || []).map((row: any) => ({
        subcategoryid: Number(row.subcategoryid),
        categoryid: Number(row.categoryid),
        categoryname: row.categories?.categoryname || '-',
        subcategoryname: row.subcategoryname || '',
        slug: row.slug || '',
        iconurl: row.iconurl || '',
        image: row.image || '',
        sortorder: Number(row.sortorder || 0),
        isactive: !!row.isactive,
        createdon: row.createdon || null,
        createdLabel: this.formatDate(row.createdon),
      }));

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Subcategories page error:', error);
      this.errorMessage = 'Something went wrong while loading subcategories.';
      this.allSubcategories = [];
      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  openCreateForm(): void {
    this.showForm = true;
    this.editingSubcategoryId = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.selectedIconFile = null;
    this.selectedImageFile = null;

    this.form = {
      categoryid: this.categories.length ? this.categories[0].categoryid : null,
      subcategoryname: '',
      slug: '',
      iconurl: '',
      image: '',
      sortorder: this.allSubcategories.length + 1,
      isactive: true,
    };

    this.cdr.detectChanges();
  }

  editSubcategory(subcategory: AdminSubcategoryItem): void {
    this.showForm = true;
    this.editingSubcategoryId = subcategory.subcategoryid;
    this.errorMessage = '';
    this.successMessage = '';
    this.selectedIconFile = null;
    this.selectedImageFile = null;

    this.form = {
      categoryid: subcategory.categoryid,
      subcategoryname: subcategory.subcategoryname,
      slug: subcategory.slug,
      iconurl: subcategory.iconurl,
      image: subcategory.image,
      sortorder: subcategory.sortorder,
      isactive: subcategory.isactive,
    };

    this.cdr.detectChanges();
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingSubcategoryId = null;
    this.selectedIconFile = null;
    this.selectedImageFile = null;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  onSubcategoryNameChange(): void {
    if (!this.editingSubcategoryId) {
      this.form.slug = this.makeSlug(this.form.subcategoryname);
      this.cdr.detectChanges();
    }
  }

  onIconFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.selectedIconFile = file;

    if (!file) {
      this.cdr.detectChanges();
      return;
    }

    const readerUrl = URL.createObjectURL(file);
    this.form.iconurl = readerUrl;
    this.cdr.detectChanges();
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.selectedImageFile = file;

    if (!file) {
      this.cdr.detectChanges();
      return;
    }

    const readerUrl = URL.createObjectURL(file);
    this.form.image = readerUrl;
    this.cdr.detectChanges();
  }

  async saveSubcategory(): Promise<void> {
    if (this.isSaving) return;

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.categoryid) {
      this.errorMessage = 'Category is required.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.form.subcategoryname.trim()) {
      this.errorMessage = 'Subcategory name is required.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.form.slug.trim()) {
      this.errorMessage = 'Slug is required.';
      this.cdr.detectChanges();
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      let iconurl = this.form.iconurl;
      let image = this.form.image;

      if (this.selectedIconFile) {
        iconurl = await this.uploadFile(
          this.selectedIconFile,
          this.mediaBucket,
          'icon'
        );
      }

      if (this.selectedImageFile) {
        image = await this.uploadFile(
          this.selectedImageFile,
          this.mediaBucket,
          'image'
        );
      }

      const payload = {
        categoryid: Number(this.form.categoryid),
        subcategoryname: this.form.subcategoryname.trim(),
        slug: this.form.slug.trim(),
        iconurl: iconurl?.trim() || null,
        image: image?.trim() || null,
        sortorder: Number(this.form.sortorder || 0),
        isactive: this.form.isactive,
        createdon: this.editingSubcategoryId ? undefined : new Date().toISOString(),
      };

      if (this.editingSubcategoryId) {
        const updatePayload = {
          categoryid: payload.categoryid,
          subcategoryname: payload.subcategoryname,
          slug: payload.slug,
          iconurl: payload.iconurl,
          image: payload.image,
          sortorder: payload.sortorder,
          isactive: payload.isactive,
        };

        const { error } = await this.supabaseService.supabase
          .from('subcategories')
          .update(updatePayload)
          .eq('subcategoryid', this.editingSubcategoryId);

        if (error) {
          console.error('Update subcategory error:', error);
          this.errorMessage = error.message || 'Failed to update subcategory.';
          this.isSaving = false;
          this.cdr.detectChanges();
          return;
        }

        this.successMessage = 'Subcategory updated successfully.';
      } else {
        const insertPayload = {
          categoryid: payload.categoryid,
          subcategoryname: payload.subcategoryname,
          slug: payload.slug,
          iconurl: payload.iconurl,
          image: payload.image,
          sortorder: payload.sortorder,
          isactive: payload.isactive,
          createdon: payload.createdon,
        };

        const { error } = await this.supabaseService.supabase
          .from('subcategories')
          .insert([insertPayload]);

        if (error) {
          console.error('Create subcategory error:', error);
          this.errorMessage = error.message || 'Failed to create subcategory.';
          this.isSaving = false;
          this.cdr.detectChanges();
          return;
        }

        this.successMessage = 'Subcategory created successfully.';
      }

      this.isSaving = false;
      this.cdr.detectChanges();
      this.cancelForm();
      await this.loadSubcategories();
    } catch (error: any) {
      console.error('Save subcategory exception:', error);
      this.errorMessage = error?.message || 'Failed to save subcategory.';
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  setSubcategoryStatusFilter(filter: SubcategoryStatusFilter): void {
    this.subcategoryStatusFilter = filter;
    this.cdr.detectChanges();
  }

  get filteredSubcategories(): AdminSubcategoryItem[] {
    const q = this.searchQuery.trim().toLowerCase();

    return this.allSubcategories.filter((subcategory) => {
      const matchesSearch =
        !q ||
        String(subcategory.subcategoryid).includes(q) ||
        String(subcategory.categoryid).includes(q) ||
        String(subcategory.subcategoryname || '').toLowerCase().includes(q) ||
        String(subcategory.categoryname || '').toLowerCase().includes(q) ||
        String(subcategory.slug || '').toLowerCase().includes(q) ||
        String(subcategory.sortorder).includes(q) ||
        (subcategory.isactive ? 'active' : 'inactive').includes(q);

      const matchesFilter =
        this.subcategoryStatusFilter === 'all' ||
        (this.subcategoryStatusFilter === 'active' && subcategory.isactive) ||
        (this.subcategoryStatusFilter === 'inactive' && !subcategory.isactive);

      return matchesSearch && matchesFilter;
    });
  }

  get totalSubcategoriesCount(): number {
    return this.allSubcategories.length;
  }

  get activeSubcategoriesCount(): number {
    return this.allSubcategories.filter((item) => item.isactive).length;
  }

  get inactiveSubcategoriesCount(): number {
    return this.allSubcategories.filter((item) => !item.isactive).length;
  }

  get totalCategoriesLinkedCount(): number {
    const uniqueCategoryIds = new Set(
      this.allSubcategories.map((item) => item.categoryid)
    );
    return uniqueCategoryIds.size;
  }

  async toggleSubcategoryStatus(
    subcategory: AdminSubcategoryItem
  ): Promise<void> {
    const nextValue = !subcategory.isactive;

    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    try {
      const { error } = await this.supabaseService.supabase
        .from('subcategories')
        .update({ isactive: nextValue })
        .eq('subcategoryid', subcategory.subcategoryid);

      if (error) {
        console.error('Toggle subcategory status error:', error);
        this.errorMessage =
          error.message || 'Failed to update subcategory status.';
        this.cdr.detectChanges();
        return;
      }

      subcategory.isactive = nextValue;
      this.successMessage = `Subcategory ${
        nextValue ? 'activated' : 'deactivated'
      } successfully.`;

      this.cdr.detectChanges();
      await this.loadSubcategories();
    } catch (error) {
      console.error('Toggle subcategory status exception:', error);
      this.errorMessage = 'Failed to update subcategory status.';
      this.cdr.detectChanges();
    }
  }

  async deleteSubcategory(subcategory: AdminSubcategoryItem): Promise<void> {
    const confirmed = window.confirm(
      `Do you want to delete subcategory "${subcategory.subcategoryname}"?`
    );

    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    try {
      const { error } = await this.supabaseService.supabase
        .from('subcategories')
        .delete()
        .eq('subcategoryid', subcategory.subcategoryid);

      if (error) {
        console.error('Delete subcategory error:', error);
        this.errorMessage = error.message || 'Failed to delete subcategory.';
        this.cdr.detectChanges();
        return;
      }

      this.successMessage = 'Subcategory deleted successfully.';
      this.cdr.detectChanges();
      await this.loadSubcategories();
    } catch (error) {
      console.error('Delete subcategory exception:', error);
      this.errorMessage = 'Failed to delete subcategory.';
      this.cdr.detectChanges();
    }
  }

  trackBySubcategory(index: number, subcategory: AdminSubcategoryItem): number {
    return subcategory.subcategoryid;
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
      month: '2-digit',
      year: 'numeric',
    });
  }
}