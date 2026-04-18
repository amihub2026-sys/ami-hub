// import { Component, OnInit } from '@angular/core';
// import { Router } from '@angular/router';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { NgSelectModule } from '@ng-select/ng-select';

// import { SupabaseService, Category, Subcategory, Post } from '../services/supabase.service';

// interface LocationData {
//   state: string;
//   districts: { name: string; areas: string[] }[];
// }

// @Component({
//   selector: 'app-post-ad',
//   standalone: true,
//   imports: [CommonModule, FormsModule, NgSelectModule],
//   templateUrl: './post-ad.html',
//   styleUrls: ['./post-ad.css']
// })
// export class PostAd implements OnInit {
//   adTitle = '';
//   category = '';
//   subcategory = '';
//   description = '';
//   price: number | null = null;

//   country = 'India';
//   state: string | null = null;
//   district: string | null = null;
//   area: string | null = null;

//   states: string[] = [];
//   districts: string[] = [];
//   areas: string[] = [];

//   categories: Category[] = [];
//   subcategories: Subcategory[] = [];

//   selectedCategoryId: number | null = null;
//   selectedSubcategoryId: number | null = null;

//   mainImage: string | null = null;
//   additionalImages: string[] = [];
//   video: File | null = null;

//   isSubmitting = false;

//   locationData: LocationData[] = [
//     {
//       state: 'Tamil Nadu',
//       districts: [
//         { name: 'Chennai', areas: ['Adyar', 'Velachery', 'T Nagar'] },
//         { name: 'Madurai', areas: ['Simmakkal', 'Alagar'] }
//       ]
//     }
//   ];

//   constructor(
//     private router: Router,
//     private supabaseService: SupabaseService
//   ) {}

//   async ngOnInit() {
//     const user = await this.supabaseService.getCurrentUser();

//     if (!user) {
//       alert('Please login first');
//       this.router.navigate(['/login']);
//       return;
//     }

//     this.states = this.locationData.map((l) => l.state);
//     await this.loadCategories();
//   }

//   async loadCategories() {
//     try {
//       this.categories = await this.supabaseService.getCategories();
//     } catch (err) {
//       console.error('Error loading categories:', err);
//       this.categories = [];
//     }
//   }

//   async onCategoryChange() {
//     const cat = this.categories.find((c) => c.categoryname === this.category);

//     this.selectedCategoryId = cat?.categoryid || null;
//     this.subcategory = '';
//     this.selectedSubcategoryId = null;
//     this.subcategories = [];

//     if (this.selectedCategoryId) {
//       try {
//         this.subcategories = await this.supabaseService.getSubcategories(this.selectedCategoryId);
//       } catch (err) {
//         console.error('Error loading subcategories:', err);
//         this.subcategories = [];
//       }
//     }
//   }

//   onStateChange() {
//     const loc = this.locationData.find((l) => l.state === this.state);
//     this.districts = loc?.districts.map((d) => d.name) || [];
//     this.district = null;
//     this.area = null;
//     this.areas = [];
//   }

//   onDistrictChange() {
//     const loc = this.locationData.find((l) => l.state === this.state);
//     const dist = loc?.districts.find((d) => d.name === this.district);
//     this.areas = dist?.areas || [];
//     this.area = null;
//   }

//   onMainImageSelected(event: any) {
//     const file = event?.target?.files?.[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = (e: any) => {
//       this.mainImage = e.target.result;
//     };
//     reader.readAsDataURL(file);
//   }

//   onAdditionalImagesSelected(event: any) {
//     const files = event?.target?.files;
//     if (!files?.length) return;

//     Array.from(files as File[]).forEach((file) => {
//       const reader = new FileReader();
//       reader.onload = (e: any) => {
//         this.additionalImages.push(e.target.result);
//       };
//       reader.readAsDataURL(file);
//     });
//   }

//   onVideoSelected(event: any) {
//     const file = event?.target?.files?.[0];
//     this.video = file || null;
//   }

//   private base64ToFile(base64: string, fileName: string, mime: string): File {
//     const parts = base64.split(',');
//     const byteString = atob(parts[1]);
//     const ab = new ArrayBuffer(byteString.length);
//     const ia = new Uint8Array(ab);

//     for (let i = 0; i < byteString.length; i++) {
//       ia[i] = byteString.charCodeAt(i);
//     }

//     return new File([ab], fileName, { type: mime });
//   }

//   private getSelectedAreaId(): number  {
   

//     const index = this.areas.findIndex((a) => a === this.area);

//     return index >= 0 ? index + 1 : 0;
//   }

//   async submitAd() {
//     if (this.isSubmitting) return;

//     if (!this.adTitle.trim()) {
//       alert('Please enter ad title');
//       return;
//     }

//     if (!this.category) {
//       alert('Please select category');
//       return;
//     }

//     if (!this.subcategory) {
//       alert('Please select subcategory');
//       return;
//     }

//     const user = await this.supabaseService.getCurrentUser();
//     if (!user) {
//       alert('Login required');
//       this.router.navigate(['/login']);
//       return;
//     }

//     this.isSubmitting = true;

//     try {
//       let mainImageUrl: string | null = null;

//       if (this.mainImage) {
//         const file = this.base64ToFile(
//           this.mainImage,
//           `main_${Date.now()}.jpg`,
//           'image/jpeg'
//         );
//         mainImageUrl = await this.supabaseService.uploadFile(file, 'main-images');
//       }

//       const additionalImageUrls: string[] = [];

//       for (const [index, img] of this.additionalImages.entries()) {
//         const file = this.base64ToFile(
//           img,
//           `additional_${Date.now()}_${index}.jpg`,
//           'image/jpeg'
//         );

//         const url = await this.supabaseService.uploadFile(file, 'additional-images');
//         if (url) {
//           additionalImageUrls.push(url);
//         }
//       }

//       let videoUrl: string | null = null;

//       if (this.video) {
//         videoUrl = await this.supabaseService.uploadFile(this.video, 'videos');
//       }

//       const selectedCat = this.categories.find((c) => c.categoryname === this.category);
//       const selectedSub = this.subcategories.find((s) => s.subcategoryname === this.subcategory);

// const post: Post = {
//   userid: String(user.id),
//   categoryid: selectedCat?.categoryid ?? null,
//   subcategoryid: selectedSub?.subcategoryid ?? null,
//   title: this.adTitle.trim(),
//   description: this.description?.trim() || '',
//   price: this.price,
//   currencycode: 'INR',
//   conditiontype: undefined,
//   status: 'Active',
//   isfeatured: false,
//   isactive: true,
//   cityid: undefined,
//   areaid: this.getSelectedAreaId() ?? undefined,
//   contactname: undefined,
//   contactphone: undefined,
//   contactemail: undefined,
//   whatsappnumber: undefined,
//   image_url: mainImageUrl ?? undefined,
//   image_urls: additionalImageUrls ?? [],
//   video_url: videoUrl ?? undefined,
//   video_urls: videoUrl ? [videoUrl] : [],
//   custom_fields: {}
// };
//       await this.supabaseService.addPost(post);

//       alert('Ad posted successfully');
//       this.router.navigate(['/products']);
//     } catch (err) {
//       console.error('Error posting ad:', err);
//       alert('Failed to post ad');
//     } finally {
//       this.isSubmitting = false;
//     }
//   }
// }