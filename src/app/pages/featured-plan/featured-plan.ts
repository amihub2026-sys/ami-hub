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

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();

    if (nav?.extras?.state?.['postId']) {
      this.postId = Number(nav.extras.state['postId']) || 0;
    } else if (typeof window !== 'undefined') {
      this.postId = Number(window.history.state?.postId) || 0;
    }

    if (nav?.extras?.state?.['adType']) {
      this.adType =
        nav.extras.state['adType'] === 'product' ? 'product' : 'service';
    } else if (typeof window !== 'undefined') {
      this.adType =
        window.history.state?.adType === 'product' ? 'product' : 'service';
    }
  }

  choosePlan(planType: 'basic' | 'standard' | 'premium') {
    if (this.isSaving) return;

    try {
      this.isSaving = true;

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

        console.log('SELECTED PLAN PAYLOAD:', selectedPlan);
      }

      this.router.navigate(['/payment']);
    } catch (err) {
      console.error('choosePlan error:', err);
      alert('Something went wrong');
    } finally {
      this.isSaving = false;
    }
  }
}