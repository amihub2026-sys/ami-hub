import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-service-categories',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-categories.html',
  styleUrls: ['./service-categories.css']
})
export class ServiceCategories {

  constructor(private router: Router) {}

  // Navigate to the corresponding service page
  navigateToService(service: string) {
    this.router.navigate(['/service-categories'], { state: { serviceCategory: service } });
  }
}