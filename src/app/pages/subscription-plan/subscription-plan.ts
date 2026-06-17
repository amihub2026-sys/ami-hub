import {
  Component,
  OnInit,
  ChangeDetectorRef,
  NgZone,
  PLATFORM_ID,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { supabase } from '../../../supabaseClient';
import { SnackbarService } from '../../services/snackbar.service';

interface SubscriptionPlanItem {
  subscriptionplanid: number;
  plan_id: string;
  planname: string;
  price: number;
  description: string;
  validitydays: number;
  postlimit: number;
  ad_limit: number;
  remaining_ads: number;
  isactive: boolean;
}

@Component({
  selector: 'app-subscription-plan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscription-plan.html',
  styleUrls: ['./subscription-plan.css'],
})
export class SubscriptionPlan implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  showSuccess = false;
  selectedPlan = '';
  isSaving = false;
  isLoadingPlans = false;
  flowType: 'normal' | 'featured' = 'normal';

  successTitle = 'Your post is posted successfully!';
  successMessage = 'Your plan is activated successfully.';

  plans: SubscriptionPlanItem[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private ngZone: NgZone,
    private snackbar: SnackbarService
  ) {}

  async ngOnInit(): Promise<void> {
    const flow = this.route.snapshot.queryParamMap.get('flow');
    this.flowType = flow === 'featured' ? 'featured' : 'normal';

    if (!this.isBrowser) return;

    await this.loadPlans();
  }

  goHome(): void {
    this.showSuccess = false;
    this.cd.detectChanges();
    this.router.navigate(['/']);
  }

  private async loadPlans(): Promise<void> {
    this.isLoadingPlans = true;

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('isactive', true)
        .order('price', { ascending: true });

      if (error) throw error;

      this.plans = (data || []).map((item: any) => ({
        subscriptionplanid: Number(item.subscriptionplanid),
        plan_id: String(item.plan_id || ''),
        planname: String(item.planname || item.name || ''),
        price: Number(item.price || 0),
        description: String(item.description || ''),
        validitydays: Number(item.validitydays || 30),
        postlimit: Number(item.postlimit || item.ad_limit || 1),
        ad_limit: Number(item.ad_limit || item.postlimit || 1),
        remaining_ads: Number(item.remaining_ads || item.ad_limit || item.postlimit || 1),
        isactive: Boolean(item.isactive ?? item.is_active)
      }));

      if (!this.plans.length) {
        this.setFallbackPlans();
      }
    } catch (err) {
      console.error('Error loading subscription plans:', err);
      this.setFallbackPlans();
    } finally {
      this.isLoadingPlans = false;
      this.cd.detectChanges();
    }
  }

  private setFallbackPlans(): void {
    this.plans = [
      {
        subscriptionplanid: 7,
        plan_id: 'basic_plan',
        planname: 'Basic Plan',
        price: 0,
        description: 'Access to core features',
        validitydays: 30,
        postlimit: 1,
        ad_limit: 1,
        remaining_ads: 1,
        isactive: true
      },
      {
        subscriptionplanid: 8,
        plan_id: 'starter_plan',
        planname: 'Starter Plan',
        price: 500,
        description: 'Priority support and better visibility',
        validitydays: 30,
        postlimit: 5,
        ad_limit: 5,
        remaining_ads: 5,
        isactive: true
      },
      {
        subscriptionplanid: 9,
        plan_id: 'premium_plan',
        planname: 'Premium Plan',
        price: 1500,
        description: 'Dedicated support and extended usage',
        validitydays: 60,
        postlimit: 15,
        ad_limit: 15,
        remaining_ads: 15,
        isactive: true
      },
      {
        subscriptionplanid: 10,
        plan_id: 'pro_plan',
        planname: 'Pro Plan',
        price: 2500,
        description: 'Maximum ads and full access',
        validitydays: 90,
        postlimit: 999,
        ad_limit: 999,
        remaining_ads: 999,
        isactive: true
      }
    ];
  }

  getPlanFeatures(planName: string): string[] {
    const name = (planName || '').toLowerCase();

    if (name === 'basic' || name === 'basic plan') {
      return ['Access to core features', 'Basic support', 'Single user'];
    }

    if (name === 'starter' || name === 'starter plan') {
      return ['All Basic features', 'Priority support', 'Up to 5 ads'];
    }

    if (name === 'premium' || name === 'premium plan') {
      return ['Extended plan validity', 'Higher ad limit', 'Priority usage'];
    }

    if (name === 'pro' || name === 'pro plan') {
      return ['Maximum ad limit', 'Longest validity', 'Full access benefits'];
    }

    return ['Plan benefits included'];
  }

  isFeaturedCard(planName: string): boolean {
    const name = (planName || '').toLowerCase();
    return name === 'starter' || name === 'starter plan';
  }

  async selectPlan(plan: SubscriptionPlanItem): Promise<void> {
    if (this.isSaving) return;

    if (!this.isBrowser) {
      this.snackbar.show('Please try again in browser.', 'error');
      return;
    }

    const pendingPostPayload = localStorage.getItem('pending_post_payload');

    if (!pendingPostPayload) {
      this.snackbar.show('Session expired. Please fill the form again.', 'error');
      this.router.navigate(['/service']);
      return;
    }

    this.ngZone.run(() => {
      this.isSaving = true;
      this.selectedPlan = plan.planname;
      this.showSuccess = false;
      this.cd.detectChanges();
    });

    try {
      const planId = plan.plan_id;

      const planPayload = {
        subscriptionplanid: plan.subscriptionplanid,
        plan_id: planId,
        plan_name: plan.planname,
        amount: plan.price,
        price: plan.price,
        duration_days: plan.validitydays,
        validitydays: plan.validitydays,

        total_ads: plan.ad_limit || plan.postlimit || 1,
        remaining_ads: plan.remaining_ads || plan.ad_limit || plan.postlimit || 1,

        isfeatured: this.flowType === 'featured',
        featured_plan_id: this.flowType === 'featured' ? planId : null,
        featured_plan_name: this.flowType === 'featured' ? plan.planname : null,
        flow_type: this.flowType
      };

      localStorage.setItem('selected_plan_payload', JSON.stringify(planPayload));

      this.ngZone.run(() => {
        this.isSaving = false;
        this.cd.detectChanges();
      });

      this.router.navigate(['/payment']);
    } catch (err) {
      console.error('PLAN SELECT ERROR:', err);

      this.ngZone.run(() => {
        this.isSaving = false;
        this.selectedPlan = '';
        this.showSuccess = false;
        this.cd.detectChanges();
      });

      this.snackbar.show('Something went wrong. Please try again.', 'error');
    }
  }
}