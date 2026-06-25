import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { supabase } from '../../../supabaseClient';

@Component({
  selector: 'app-job',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job.html',
  styleUrl: './job.css'
})
export class Job implements OnInit {

  showJobList = true;
  showJobForm = false;

  jobs: any[] = [];

  selectedType = 'All';
  showApplyForm = false;
  showJobDetails = false;

  selectedJob: any = null;
  selectedResume: File | null = null;

  application = {
    name: '',
    email: '',
    phone: '',
    message: ''
  };

  jobId: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.jobId = this.route.snapshot.paramMap.get('id');

    if (this.jobId) {
      this.showJobList = false;
      this.showJobDetails = true;
      this.loadJobDetails(this.jobId);
    } else {
      this.showJobList = true;
      this.showJobDetails = false;
      this.loadJobs();
    }
  }

  async loadJobs() {
    const { data, error } = await supabase
      .from('job_vacancies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Load jobs error:', error);
      return;
    }

    this.jobs = data || [];
  }

  async loadJobDetails(id: string) {
    const { data, error } = await supabase
      .from('job_vacancies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Job details error:', error);
      return;
    }

    this.selectedJob = data;
  }

  // FILTER JOBS
  filteredJobs() {
    if (this.selectedType === 'All') {
      return this.jobs;
    }

    return this.jobs.filter(job => job.job_type === this.selectedType);
  }

  goToAddJob() {
    this.router.navigate(['/add-job']);
  }

  openApplyForm(job: any) {
    this.selectedJob = job;
    this.showApplyForm = true;
  }

  openJobDetails(job: any) {
    this.selectedJob = job;
    this.showJobDetails = true;
    this.showJobList = false;
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

  onResumeSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    this.selectedResume = input.files[0];
  }
}