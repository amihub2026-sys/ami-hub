import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.css']
})
export class Contact {
  formData = {
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: ''
  };

  submitForm() {
    console.log('Contact Form Data:', this.formData);
    alert('Your message has been submitted successfully!');

    this.formData = {
      name: '',
      phone: '',
      email: '',
      subject: '',
      message: ''
    };
  }
}