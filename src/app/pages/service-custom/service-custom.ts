import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface ServiceField {
  label: string;
  name: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

@Component({
  selector: 'app-service-custom',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-custom.html',
  styleUrls: ['./service-custom.css']
})
export class ServiceCustom implements OnInit {

  category = '';
  subcategory = '';
  location = '';

  fields: ServiceField[] = [];
  formData: any = {};

  adPosted: boolean = false; // <-- Track success overlay

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    let data: any = this.router.getCurrentNavigation()?.extras?.state;

    // fallback for refresh / SSR
    if (!data && isPlatformBrowser(this.platformId)) {
      data = window.history.state;
    }

    if (!data) return;

    this.category = data.category || '';
    this.subcategory = data.subcategory || '';

    if (data.location) {
      this.location =
        data.location.state + ', ' +
        data.location.district + ', ' +
        data.location.area;
    }

    this.loadFields();
  }

  loadFields() {
    if (this.subcategory === 'Plumbing') {
      this.fields = [
        { label: 'Experience (Years)', name: 'experience', type: 'number' },
        { label: 'Visit Charge (₹)', name: 'visitCharge', type: 'number' }
      ];
    } else if (this.subcategory === 'Electrician') {
      this.fields = [
        { label: 'Experience (Years)', name: 'experience', type: 'number' },
        { label: 'License Number', name: 'license', type: 'text' }
      ];
    } else if (this.subcategory === 'AC Repair') {
      this.fields = [
        { label: 'AC Type', name: 'acType', type: 'select', options: ['Split AC','Window AC'] },
        { label: 'Service Type', name: 'serviceType', type: 'select', options: ['Repair','Installation'] }
      ];
    } else if (this.subcategory === 'Home Cleaning') {
      this.fields = [
        { label: 'Cleaning Type', name: 'cleaningType', type: 'select', options: ['Basic','Deep'] },
        { label: 'Team Size', name: 'teamSize', type: 'number' }
      ];
    } else if (this.subcategory === 'Painting') {
      this.fields = [
        { label: 'Painting Type', name: 'paintingType', type: 'select', options: ['Interior','Exterior'] },
        { label: 'Area Size', name: 'areaSize', type: 'number' }
      ];
    }

    // Initialize form data
    this.fields.forEach(field => {
      this.formData[field.name] = '';
    });
  }

  submitService() {
    // Here you can send the data to backend (Supabase/API) if needed
    const finalData = {
      category: this.category,
      subcategory: this.subcategory,
      location: this.location,
      customFields: this.formData
    };

    console.log("Final Data:", finalData);

    // Show overlay
    this.adPosted = true;
  }

  goBack() {
    this.router.navigate(['/dashboard']); // change to your dashboard route
  }

  viewAd() {
    alert("Redirect to ad details page"); // or navigate to ad detail page
  }

}