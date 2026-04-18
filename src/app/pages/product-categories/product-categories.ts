import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-product-categories',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-categories.html',
  styleUrls: ['./product-categories.css']
})
export class ProductCategories {}