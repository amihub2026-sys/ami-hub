import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.css']
})
export class AdminLogin {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private router: Router) {}

  login() {
    if (this.email === 'Amihubadmin@com' && this.password === 'Amihub123') {
      localStorage.setItem('adminLogin', 'true');
       localStorage.setItem('adminRole', 'super'); 
      this.router.navigate(['/admin']);
    } else {
      this.errorMessage = 'Invalid admin email or password';
    }
  
    if (this.email === 'postadmin@gmail.com' && this.password === 'post123') {
    localStorage.setItem('adminLogin', 'true');
    localStorage.setItem('adminRole', 'post');
    
    
    this.router.navigate(['/admin']);
    return;
  }

  this.errorMessage = 'Invalid admin email or password';
}
}

