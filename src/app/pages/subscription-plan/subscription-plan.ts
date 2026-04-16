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

interface SubscriptionPlanItem {
  subscriptionplanid: number;
  planname: string;
  price: number;
  description: string;
  validitydays: number;
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
  selectedPlan: string = '';
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
    private ngZone: NgZone
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

      this.plans = (data || []).map((item: any) => {
        const planId = String(item.plan_id || '').trim().toLowerCase();
        const planName = String(item.planname || '').trim().toLowerCase();

        return {
          subscriptionplanid: Number(item.subscriptionplanid),
          planname: String(item.planname || ''),
          price:
            planId === 'basic_plan' || planName === 'basic plan'
              ? 1
              : Number(item.price || 0),
          description: String(item.description || ''),
          validitydays: Number(item.validitydays || 30),
          isactive: Boolean(item.isactive)
        };
      });

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
        planname: 'Basic Plan',
        price: 1,
        description: 'Access to core features',
        validitydays: 30,
        isactive: true
      },
      {
        subscriptionplanid: 8,
        planname: 'Starter Plan',
        price: 500,
        description: 'Priority support and better visibility',
        validitydays: 30,
        isactive: true
      },
      {
        subscriptionplanid: 9,
        planname: 'Premium Plan',
        price: 1500,
        description: 'Dedicated support and extended usage',
        validitydays: 60,
        isactive: true
      },
      {
        subscriptionplanid: 10,
        planname: 'Pro Plan',
        price: 2500,
        description: 'Maximum ads and full access',
        validitydays: 90,
        isactive: true
      }
    ];
  }

  getPlanFeatures(planName: string): string[] {
    const name = (planName || '').toLowerCase();

    if (name === 'basic' || name === 'basic plan') {
      return [
        'Access to core features',
        'Basic support',
        'Single user'
      ];
    }

    if (name === 'starter' || name === 'starter plan') {
      return [
        'All Basic features',
        'Priority support',
        'Up to 5 ads'
      ];
    }

    if (name === 'premium' || name === 'premium plan') {
      return [
        'Extended plan validity',
        'Higher ad limit',
        'Priority usage'
      ];
    }

    if (name === 'pro' || name === 'pro plan') {
      return [
        'Maximum ad limit',
        'Longest validity',
        'Full access benefits'
      ];
    }

    return ['Plan benefits included'];
  }

  isFeaturedCard(planName: string): boolean {
    const name = (planName || '').toLowerCase();
    return name === 'starter' || name === 'starter plan';
  }

  private getPlanIdFromPlanName(planName: string): string {
    const name = (planName || '').trim().toLowerCase();

    switch (name) {
      case 'basic':
      case 'basic plan':
        return 'basic_plan';

      case 'starter':
      case 'starter plan':
        return 'starter_plan';

      case 'premium':
      case 'premium plan':
        return 'premium_plan';

      case 'pro':
      case 'pro plan':
        return 'pro_plan';

      default:
        return 'basic_plan';
    }
  }

  async selectPlan(plan: SubscriptionPlanItem): Promise<void> {
    if (this.isSaving) return;

    if (!this.isBrowser) {
      alert('Please try again in browser.');
      return;
    }

    const pendingPostPayload = localStorage.getItem('pending_post_payload');
    console.log('pending_post_payload on plan click:', pendingPostPayload);

    if (!pendingPostPayload) {
      alert('Session expired. Please fill the form again.');
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
      const planId = this.getPlanIdFromPlanName(plan.planname);

      const planPayload = {
        subscriptionplanid: plan.subscriptionplanid,
        plan_id: planId,
        plan_name: plan.planname,
        amount: plan.price,
        price: plan.price,
        duration_days: plan.validitydays,
        validitydays: plan.validitydays,

        total_ads: 1,
        remaining_ads: 1,

        isfeatured: this.flowType === 'featured',
        featured_plan_id: this.flowType === 'featured' ? planId : null,
        featured_plan_name: this.flowType === 'featured' ? plan.planname : null,
        flow_type: this.flowType
      };

      console.log('SELECTED PLAN PAYLOAD:', planPayload);

      localStorage.setItem(
        'selected_plan_payload',
        JSON.stringify(planPayload)
      );

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

      alert('Something went wrong. Please try again.');
    }
  }
}