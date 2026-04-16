// admin-page.ts
import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-page',
  standalone: true,            // <-- Standalone solves CommonModule issues
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-page.html',
  styleUrls: ['./admin-page.css']
})
export class AdminPage implements AfterViewInit {
  username = 'Admin';
  searchQuery = '';

  totalCustomers = 120;
  activeOrders = 45;
  newSignups = 15;
  revenue = 9800;

  customers = [
    { name: 'John Doe', email: 'john@example.com', phone: '1234567890', status: 'Active' },
    { name: 'Jane Smith', email: 'jane@example.com', phone: '9876543210', status: 'Inactive' },
    { name: 'Alice Brown', email: 'alice@example.com', phone: '4561237890', status: 'Active' },
  ];

  ngAfterViewInit() {
    // Customer Growth Chart
    new Chart("customerGrowthChart", {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          label: 'Customers',
          data: [50, 60, 80, 90, 120],
          borderColor: '#0d3b66',
          backgroundColor: 'rgba(13,59,102,0.2)',
          fill: true,
        }]
      },
      options: { responsive: true }
    });

    // Revenue Chart
    new Chart("revenueChart", {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          label: 'Revenue ($)',
          data: [2000, 4000, 5000, 7000, 9800],
          backgroundColor: '#1f5c99',
        }]
      },
      options: { responsive: true }
    });
  }
}