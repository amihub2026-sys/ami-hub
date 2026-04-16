import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-custom-fields',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-fields.html',
  styleUrls: ['./custom-fields.css']
})
export class CustomFields {

  category = '';
  subcategory = '';
  fields: any[] = [];
  formData: any = {};
  adPosted: boolean = false;

  customFieldsMap: any = {
    Vehicles: {
      Cars: [
        { name: 'brand', label: 'Brand', type: 'text' },
        { name: 'model', label: 'Model', type: 'text' },
        { name: 'year', label: 'Year', type: 'number' },
        { name: 'mileage', label: 'Mileage', type: 'number' }
      ],
      Bikes: [
        { name: 'brand', label: 'Brand', type: 'text' },
        { name: 'engine', label: 'Engine CC', type: 'number' },
        { name: 'year', label: 'Year', type: 'number' }
      ]
    },
    Electronics: {
      Mobiles: [
        { name: 'brand', label: 'Brand', type: 'text' },
        { name: 'model', label: 'Model', type: 'text' },
        { name: 'storage', label: 'Storage', type: 'text' }
      ],
      Laptops: [
        { name: 'brand', label: 'Brand', type: 'text' },
        { name: 'model', label: 'Model', type: 'text' },
        { name: 'ram', label: 'RAM', type: 'text' }
      ]
    }
  };

  constructor(private router: Router) {

    const nav = this.router.getCurrentNavigation();

    if(nav?.extras?.state){

      this.category = nav.extras.state['category'];
      this.subcategory = nav.extras.state['subcategory'];

      if(this.customFieldsMap[this.category] &&
         this.customFieldsMap[this.category][this.subcategory]){

        this.fields = this.customFieldsMap[this.category][this.subcategory];
      }
    }
  }

  isLoggedIn(){
    return localStorage.getItem('userToken');
  }

  submitCustomFields(){

    if(!this.isLoggedIn()){

      this.router.navigate(['/login'],{
        state:{
          category:this.category,
          subcategory:this.subcategory
        }
      });

      return;
    }

    console.log('Ad Data:',this.formData);

    this.adPosted = true;
  }

  goBack(){
    this.router.navigate(['/subscription-plan']);
  }

  viewAd(){
    console.log("View Ad Clicked");
  }

}