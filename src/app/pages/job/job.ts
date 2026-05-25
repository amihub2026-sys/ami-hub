import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-job',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job.html',
  styleUrl: './job.css'
})
export class Job {
  showJobList = true;
  showJobForm = false;

  jobs = [
    {
      title: 'Frontend Developer',
      company: 'AMI HUB',
      location: 'Madurai',
      salary: '₹20,000 - ₹35,000',
      type: 'Full Time'
    },
    {
      title: 'Flutter Developer',
      company: 'Tech Solutions',
      location: 'Chennai',
      salary: '₹25,000 - ₹45,000',
      type: 'Full Time'
    },
    {
      title: 'Digital Marketing Executive',
      company: 'Marketing Pro',
      location: 'Coimbatore',
      salary: '₹15,000 - ₹25,000',
      type: 'Part Time'
    }
  ];

  newJob = {
    title: '',
    company: '',
    location: '',
    salary: '',
    type: ''
  };
  constructor(private router: Router) {}

  openJobs() {
    this.showJobList = true;
    this.showJobForm = false;
  }

  openAddJob() {
    this.showJobForm = true;
  }

  saveJob() {
    if (!this.newJob.title || !this.newJob.company) {
      alert('Please enter job title and company');
      return;
    }

    this.jobs.unshift({ ...this.newJob });

    this.newJob = {
      title: '',
      company: '',
      location: '',
      salary: '',
      type: ''
    };

    this.showJobForm = false;
  }
  goToAddJob() {
  this.router.navigate(['/add-job']);
}
selectedType = 'All';
showApplyForm = false;
selectedJob: any = null;

application = {
  name: '',
  email: '',
  phone: '',
  message: ''
};

filteredJobs() {
  if (this.selectedType === 'All') {
    return this.jobs;
  }

  return this.jobs.filter(job => job.type === this.selectedType);
}

openApplyForm(job: any) {
  this.selectedJob = job;
  this.showApplyForm = true;
}

submitApplication() {
  alert('Application submitted successfully!');
  this.showApplyForm = false;

  this.application = {
    name: '',
    email: '',
    phone: '',
    message: ''
  };
}
showJobDetails = false;

openJobDetails(job: any) {
  this.selectedJob = job;
  this.showJobDetails = true;
}
selectedResume: File | null = null;

onResumeSelected(event: Event) {
  const input = event.target as HTMLInputElement;

  if (!input.files || input.files.length === 0) {
    return;
  }

  this.selectedResume = input.files[0];

  if (!this.selectedResume) {
    alert('Please upload your resume');
    return;
  }

  console.log('Application:', this.application);
  console.log('Resume:', this.selectedResume);

  alert('Application submitted successfully!');

  this.showApplyForm = false;
  this.selectedResume = null;

  this.application = {
    name: '',
    email: '',
    phone: '',
    message: ''
  };
}
}
