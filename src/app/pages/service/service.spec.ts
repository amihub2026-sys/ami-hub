import { Component } from '@angular/core';

@Component({
  selector: 'app-service',
  templateUrl: './service.html',
  styleUrls: ['./service.css']
})
export class Service {
  // Ad form fields
  adTitle: string = '';
  category: string = '';
  subcategory: string = '';
  description: string = '';
  price: number | null = null;
  country: string = 'India';

  // File uploads
  images: File[] = [];
  video: File | null = null;

  // Dropdowns
  categoryList: string[] = ['Plumbing', 'Electrical', 'Cleaning'];
  subcategoryList: string[] = [];

  states: string[] = ['Tamil Nadu', 'Kerala', 'Karnataka'];
  districts: string[] = [];
  areas: string[] = [];

  state: string = '';
  district: string = '';
  area: string = '';

  // Category change
  onCategoryChange() {
    if (this.category === 'Plumbing') this.subcategoryList = ['Pipes', 'Faucets'];
    else if (this.category === 'Electrical') this.subcategoryList = ['Wiring', 'Lights'];
    else if (this.category === 'Cleaning') this.subcategoryList = ['House Cleaning', 'Car Cleaning'];
    else this.subcategoryList = [];

    this.subcategory = '';
  }

  // State change
  onStateChange() {
    if (this.state === 'Tamil Nadu') this.districts = ['Madurai', 'Chennai', 'Coimbatore'];
    else if (this.state === 'Kerala') this.districts = ['Kochi', 'Trivandrum'];
    else if (this.state === 'Karnataka') this.districts = ['Bengaluru', 'Mysuru'];
    else this.districts = [];

    this.district = '';
    this.areas = [];
    this.area = '';
  }

  // District change
  onDistrictChange() {
    if (this.district === 'Madurai') this.areas = ['Thiruparankundram', 'Avaniapuram'];
    else if (this.district === 'Chennai') this.areas = ['Adyar', 'Velachery'];
    else if (this.district === 'Coimbatore') this.areas = ['RS Puram', 'Peelamedu'];
    else this.areas = [];

    this.area = '';
  }

  // File selection
  onFileSelected(event: any) {
    this.images = Array.from(event.target.files);
  }

  onVideoSelected(event: any) {
    this.video = event.target.files[0];
  }

  // Form submit
  goToCustomFields() {

    // Navigate to custom fields or next step
  }
}