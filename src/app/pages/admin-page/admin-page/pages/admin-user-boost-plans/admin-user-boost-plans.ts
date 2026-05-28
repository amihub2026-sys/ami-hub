import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-user-boost-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-user-boost-plans.html',
  styleUrls: ['./admin-user-boost-plans.css'],
})
export class AdminUserBoostPlansComponent {
  @Input() searchQuery = '';
}
