import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-job',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-job.html',
  styleUrl: './add-job.css'
})
export class AddJob {
  job = {
    title: '',
    company: '',
    location: '',
    jobType: '',
    workMode: '',
    salary: '',
    experience: '',
    vacancies: '',
    skills: '',
    description: '',
    contactEmail: '',
    contactPhone: ''
  };

  submitJob() {
    console.log('Job Vacancy:', this.job);
    alert('Job vacancy added successfully!');
  }
}