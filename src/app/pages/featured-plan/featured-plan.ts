import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-featured-plan',
  standalone: true,
  imports: [],
  templateUrl: './featured-plan.html',
  styleUrl: './featured-plan.css',
})
export class FeaturedPlan {
  postId: number = 0;
  adType: 'service' | 'product' = 'service';
  isSaving = false;
  postDetails: any = null;

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    const navState = nav?.extras?.state || {};
    const historyState =
      typeof window !== 'undefined' ? window.history.state || {} : {};

    this.postId = Number(navState['postId'] || historyState['postId'] || 0);

    this.adType =
      (navState['adType'] || historyState['adType']) === 'product'
        ? 'product'
        : 'service';

    this.postDetails =
      navState['postDetails'] ||
      historyState['postDetails'] ||
      this.getStoredPendingPost();

    if ((!this.postId || this.postId <= 0) && this.postDetails?.postid) {
      this.postId = Number(this.postDetails.postid) || 0;
    }

    if ((!this.adType || this.adType === 'service') && this.postDetails) {
      const type = String(
        this.postDetails?.adtype || this.postDetails?.conditiontype || 'service'
      )
        .toLowerCase()
        .trim();

      this.adType = type === 'product' ? 'product' : 'service';
    }

    if (this.postDetails && this.postId > 0) {
      this.postDetails = {
        ...this.postDetails,
        postid: Number(this.postDetails?.postid || this.postId),
        adtype:
          this.postDetails?.adtype ||
          this.postDetails?.conditiontype ||
          this.adType,
        conditiontype:
          this.postDetails?.conditiontype ||
          this.postDetails?.adtype ||
          this.adType,
      };
    }

  
  }

  private getStoredPendingPost(): any {
    if (typeof window === 'undefined') return null;

    try {
      const raw = localStorage.getItem('pending_post_payload');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Error reading pending_post_payload:', error);
      return null;
    }
  }

  private storePendingPost(): void {
    if (typeof window === 'undefined') return;

    if (!this.postDetails || !this.postId) {
      return;
    }

    const payload = {
      ...this.postDetails,
      postid: Number(this.postDetails?.postid || this.postId),
      adtype:
        this.postDetails?.adtype ||
        this.postDetails?.conditiontype ||
        this.adType,
      conditiontype:
        this.postDetails?.conditiontype ||
        this.postDetails?.adtype ||
        this.adType,
    };

    localStorage.setItem('pending_post_payload', JSON.stringify(payload));
    localStorage.setItem('pending_post_flow', 'featured');
    localStorage.setItem('pending_post_type', this.adType);

    if (payload?.userid != null) {
      localStorage.setItem('pending_post_userid', String(payload.userid));
    }

    
  }

  choosePlan(planType: 'basic' | 'standard' | 'premium') {
    if (this.isSaving) return;

    if (!this.postId || this.postId <= 0) {
      alert('Post details not found. Please go back and try again.');
      return;
    }

    try {
      this.isSaving = true;

      this.storePendingPost();

      let selectedPlan: any = null;

      if (planType === 'basic') {
        selectedPlan = {
          boost_plan_id: 'boost_1_day',
          boost_name: 'Quick Boost',

          plan_id: 'boost_1_day',
          featured_plan_id: 'boost_1_day',

          plan_name: 'Quick Boost',
          featured_plan_name: 'Quick Boost',

          amount: 1,
          price: 1,
          duration_days: 1,
          isfeatured: true,
          is_featured: true,
          ad_type: this.adType,
          postId: this.postId
        };
      } else if (planType === 'standard') {
        selectedPlan = {
          boost_plan_id: 'boost_5_day',
          boost_name: 'Popular Boost',

          plan_id: 'boost_5_day',
          featured_plan_id: 'boost_5_day',

          plan_name: 'Popular Boost',
          featured_plan_name: 'Popular Boost',

          amount: 500,
          price: 500,
          duration_days: 5,
          isfeatured: true,
          is_featured: true,
          ad_type: this.adType,
          postId: this.postId
        };
      } else {
        selectedPlan = {
          boost_plan_id: 'boost_9_day',
          boost_name: 'Max Boost',

          plan_id: 'boost_9_day',
          featured_plan_id: 'boost_9_day',

          plan_name: 'Max Boost',
          featured_plan_name: 'Max Boost',

          amount: 900,
          price: 900,
          duration_days: 9,
          isfeatured: true,
          is_featured: true,
          ad_type: this.adType,
          postId: this.postId
        };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'selected_plan_payload',
          JSON.stringify(selectedPlan)
        );

       
      }

      this.router.navigate(['/payment'], {
        state: {
          postId: this.postId,
          adType: this.adType,
          postDetails: this.postDetails,
          selectedPlan
        }
      });
    } catch (err) {
      console.error('choosePlan error:', err);
      alert('Something went wrong');
    } finally {
      this.isSaving = false;
    }
  }
}