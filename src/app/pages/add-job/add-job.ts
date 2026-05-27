import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { supabase } from '../../../supabaseClient';

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

  async submitJob() {

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('job_vacancies')
      .insert({
        job_title: this.job.title,
        company_name: this.job.company,
        location: this.job.location,
        salary: this.job.salary,
        experience: this.job.experience,
        vacancies: this.job.vacancies,
        skills: this.job.skills,
        description: this.job.description,
        contact_email: this.job.contactEmail,
        contact_phone: this.job.contactPhone,
        job_type: this.job.jobType,
        work_mode: this.job.workMode,
        user_id: user?.id || null
      });

    if (error) {
      console.error('Job insert error:', error);
      alert('Job not added');
      return;
    }

    alert('Job vacancy added successfully!');

    this.job = {
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
  }
}