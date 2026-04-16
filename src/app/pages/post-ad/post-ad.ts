import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { SupabaseService, Post } from '../../services/supabase.service';

interface LocationData {
  state: string;
  districts: { name: string; areas: string[] }[];
}

@Component({
  selector: 'app-post-ad',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './post-ad.html',
  styleUrls: ['./post-ad.css']
})
export class PostAd implements OnInit {

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  // ---------------- Ad fields ----------------
  adTitle = '';
  category = '';
  subcategory = '';
  description = '';
  price: number | null = null;

  // ---------------- Location ----------------
  country = 'India';
  state: string | null = null;
  district: string | null = null;
  area: string | null = null;

  states: string[] = [];
  districts: string[] = [];
  areas: string[] = [];

  locationData: LocationData[] = [
    {
      state: 'Tamil Nadu',
      districts: [
        { name: 'Chennai', areas: ['Adyar','Velachery','T Nagar'] },
        { name: 'Coimbatore', areas: ['RS Puram','Peelamedu'] }
      ]
    }
  ];

  // ---------------- Categories ----------------
  categories: Record<string,string[]> = {
    Services:['Plumbing','Electrician'],
    Vehicles:['Cars','Bikes'],
    Electronics:['Mobiles','Laptops']
  };

  // ---------------- Media ----------------
  mainImage: File | null = null;
  additionalImages: File[] = [];
  video: File | null = null;

  mainImagePreview: string | null = null;
  additionalImagePreviews: string[] = [];
  videoPreview: string | null = null;

  ngOnInit() {
    this.states = this.locationData.map(x => x.state);
  }

  // ---------------- Location Change ----------------
  onStateChange() {
    const selected = this.locationData.find(x => x.state === this.state);
    this.districts = selected ? selected.districts.map(d => d.name) : [];
    this.district = null;
    this.areas = [];
  }

  onDistrictChange() {
    const stateData = this.locationData.find(x => x.state === this.state);
    const districtData = stateData?.districts.find(d => d.name === this.district);
    this.areas = districtData ? districtData.areas : [];
  }

  get categoryList() {
    return Object.keys(this.categories);
  }

  get subcategoryList() {
    return this.categories[this.category] || [];
  }

  onCategoryChange() {
    this.subcategory = '';
  }

  // ---------------- Media Handling ----------------
  onMainImageSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.mainImage = file;
      this.mainImagePreview = URL.createObjectURL(file);
    }
  }

  removeMainImage() {
    this.mainImage = null;
    this.mainImagePreview = null;
  }

  onAdditionalImagesSelected(event: any) {
    const files = Array.from(event.target.files || []) as File[];
    files.forEach(file => {
      this.additionalImages.push(file);
      this.additionalImagePreviews.push(URL.createObjectURL(file));
    });
  }

  removeAdditionalImage(i: number) {
    this.additionalImages.splice(i,1);
    this.additionalImagePreviews.splice(i,1);
  }

  onVideoSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.video = file;
      this.videoPreview = URL.createObjectURL(file);
    }
  }

  // ---------------- Submit Ad ----------------
  async submitAd() {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (!user) {
        alert("Please login first");
        return;
      }

      // Upload main image
      const mainImageURL = this.mainImage
        ? await this.supabaseService.uploadFile(this.mainImage, 'main-images')
        : null;

      // Upload additional images
      const additionalImagesURLs: string[] = [];
      for (const img of this.additionalImages) {
        const url = await this.supabaseService.uploadFile(img, 'additional-images');
        if (url) additionalImagesURLs.push(url);
      }

      // Upload video
      const videoURL = this.video
        ? await this.supabaseService.uploadFile(this.video, 'videos')
        : null;

      const post: Post = {
        userid: user.id,
        categoryid: null,
        subcategoryid: null,
        title: this.adTitle,
        description: this.description,
        price: this.price,
        currencycode: 'INR',
        status: 'Active',
        isfeatured: false,
        isactive: true,
        cityid: null,
        areaid: null,
        image_url: mainImageURL ?? undefined,
        image_urls: additionalImagesURLs,
      video_url: videoURL ?? undefined,
      };

      await this.supabaseService.addPost(post);

      alert("Ad posted successfully");
      this.router.navigate(['/custom-fields'], { state: post });

    } catch (err) {
      console.error(err);
      alert("Error posting ad");
    }
  }

}