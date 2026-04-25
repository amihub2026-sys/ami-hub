import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { supabase } from '../../../supabaseClient';
import { SupabaseService } from '../../services/supabase.service';
import { PostDraftService } from '../../services/post-draft.service';
import { SnackbarService } from '../../services/snackbar.service';
declare global {
  interface Window {
    Razorpay: any;
  }
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment.html',
  styleUrls: ['./payment.css']
})
export class Payment implements OnInit {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private supabaseService = inject(SupabaseService);
  private postDraftService = inject(PostDraftService);
private snackbar = inject(SnackbarService);
  private isBrowser = isPlatformBrowser(this.platformId);

  isPaying = signal(false);
  paymentSuccess = signal(false);
  paymentFailed = signal(false);
  errorMessage = signal('');
  isRetryingSave = signal(false);

  planData: any = null;
  postData: any = null;

  private readonly razorpayKey = 'rzp_live_S7g9JgHJea4xYt';
  private readonly verifiedPaymentStorageKey = 'verified_payment_payload';
  private readonly featureEditContextStorageKey = 'feature_edit_post_context';

  async ngOnInit(): Promise<void> {
    if (!this.isBrowser) return;
    await this.loadStoredData();
    this.loadRazorpayScript();
    this.restoreVerifiedPaymentState();
  }

  async loadStoredData(): Promise<void> {
    try {
      const rawPlan = localStorage.getItem('selected_plan_payload');
      const rawPost = localStorage.getItem('pending_post_payload');
      const rawFeatureEditContext = localStorage.getItem(
        this.featureEditContextStorageKey
      );

      this.planData = rawPlan ? JSON.parse(rawPlan) : null;
      this.postData = rawPost ? JSON.parse(rawPost) : null;

      const isFeaturedFlow =
        !!this.planData?.boost_plan_id ||
        !!this.planData?.featured_plan_id ||
        this.planData?.isfeatured === true ||
        this.planData?.is_featured === true;

      if (!this.postData && isFeaturedFlow && rawFeatureEditContext) {
        const featureEditContext = JSON.parse(rawFeatureEditContext);

        if (featureEditContext?.postData) {
          this.postData = featureEditContext.postData;
        } else if (featureEditContext?.postId) {
          const fetchedPost = await this.fetchPostById(Number(featureEditContext.postId));
          if (fetchedPost) {
            this.postData = fetchedPost;
          }
        }
      }

      if ((!this.postData || !this.postData?.postid) && isFeaturedFlow) {
        const postIdFromPlan = Number(
          this.planData?.postId ||
          this.planData?.post_id ||
          this.planData?.selected_post_id ||
          0
        );

        if (postIdFromPlan) {
          const fetchedPost = await this.fetchPostById(postIdFromPlan);
          if (fetchedPost) {
            this.postData = fetchedPost;
          }
        }
      }

 
      if (!this.postData) {
        this.errorMessage.set('Post details not found. Please fill the form again.');
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      this.errorMessage.set('Unable to load payment details.');
    }
  }

  private async fetchPostById(postId: number): Promise<any | null> {
    try {
      if (!postId) return null;

      const { data, error } = await this.supabaseService.supabase
        .from('post')
        .select('*')
        .eq('postid', postId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching post by id:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching post by id:', error);
      return null;
    }
  }

  private restoreVerifiedPaymentState(): void {
    try {
      const raw = localStorage.getItem(this.verifiedPaymentStorageKey);
      if (!raw) return;

      const verifiedPayment = JSON.parse(raw);

      if (verifiedPayment?.verified === true) {
        this.paymentFailed.set(true);
        this.errorMessage.set(
          'Payment was already completed. Post save failed earlier. Click retry to save the post without paying again.'
        );
      }
    } catch (error) {
      console.error('Error restoring verified payment state:', error);
    }
  }

  private saveVerifiedPaymentState(payload: any): void {
    try {
      localStorage.setItem(
        this.verifiedPaymentStorageKey,
        JSON.stringify({
          verified: true,
          savedAt: new Date().toISOString(),
          ...payload
        })
      );
    } catch (error) {
      console.error('Error saving verified payment state:', error);
    }
  }

  private clearVerifiedPaymentState(): void {
    try {
      localStorage.removeItem(this.verifiedPaymentStorageKey);
    } catch (error) {
      console.error('Error clearing verified payment state:', error);
    }
  }

  private loadRazorpayScript(): void {
    if (!this.isBrowser) return;

    const existing = document.getElementById('razorpay-checkout-js');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }

  private getSelectedPlanId(): string | null {
    return (
      this.planData?.boost_plan_id ||
      this.planData?.featured_plan_id ||
      this.planData?.plan_id ||
      null
    );
  }

  private getSelectedPlanName(): string {
    return (
      this.planData?.boost_name ||
      this.planData?.featured_plan_name ||
      this.planData?.plan_name ||
      'Selected Plan'
    );
  }

  private getSelectedPlanIsFeatured(): boolean {
    if (typeof this.planData?.isfeatured === 'boolean') {
      return this.planData.isfeatured;
    }

    if (typeof this.planData?.is_featured === 'boolean') {
      return this.planData.is_featured;
    }

    if (this.planData?.boost_plan_id || this.planData?.featured_plan_id) {
      return true;
    }

    return false;
  }

  private isFeaturedPlanFlow(): boolean {
    return !!(
      this.planData?.boost_plan_id ||
      this.planData?.featured_plan_id ||
      this.planData?.isfeatured === true ||
      this.planData?.is_featured === true
    );
  }

  private isExistingPostFeaturedFlow(): boolean {
    return this.isFeaturedPlanFlow() && !!this.postData?.postid;
  }

  private isSubscriptionPlanFlow(): boolean {
    return !this.isFeaturedPlanFlow();
  }

  get planName(): string {
    return this.getSelectedPlanName();
  }

  get amount(): number {
    const value = Number(this.planData?.amount || this.planData?.price || 0);
    return Number.isFinite(value) ? value : 0;
  }

  get postTitle(): string {
    return this.postData?.title || 'Your Ad';
  }

  get adType(): string {
    return this.postData?.conditiontype || this.postData?.adtype || 'post';
  }

  get sellerName(): string {
    return this.postData?.contactname || this.postData?.name || 'User';
  }

  get sellerEmail(): string {
    return this.postData?.contactemail || '';
  }

  get sellerPhone(): string {
    return this.postData?.contactphone || this.postData?.whatsappnumber || '';
  }

  private isValidFile(file: unknown): file is File {
    return !!file && file instanceof File;
  }

  private async getAccessToken(): Promise<string | null> {
    const effectiveSession = await this.supabaseService.getEffectiveAuthUser();
    if (!effectiveSession.isAuthenticated) {
      return null;
    }

    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  private async getEffectiveUserUuid(): Promise<string | null> {
    const effectiveSession = await this.supabaseService.getEffectiveAuthUser();

    if (!effectiveSession.isAuthenticated) {
      return null;
    }

    const resolvedUuid = await this.supabaseService.resolveEffectiveUserUuid();
    if (resolvedUuid) {
      return resolvedUuid;
    }

    return effectiveSession.authUser?.id || effectiveSession.supabase_uid || null;
  }

  private parseJsonArray<T = any>(value: any): T[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  private async readEdgeFunctionError(error: any): Promise<string> {
    try {
      const response = error?.context;

      if (!response) {
        return error?.message || 'Payment verification failed';
      }

      if (typeof response.text === 'function') {
        const rawText = await response.text();
    

        if (!rawText) {
          return error?.message || 'Payment verification failed';
        }

        try {
          const parsed = JSON.parse(rawText);
          return (
            parsed?.error?.toString() ||
            parsed?.message?.toString() ||
            rawText
          );
        } catch {
          return rawText;
        }
      }

      return error?.message || 'Payment verification failed';
    } catch (readError) {
      console.error('Failed to read edge function error body:', readError);
      return error?.message || 'Payment verification failed';
    }
  }

  private async uploadMainPhoto(
    uploadedFiles: { bucket: string; url: string }[]
  ): Promise<string> {
    const file = this.postDraftService.getMainPhoto();

    if (!this.isValidFile(file)) {
      return '';
    }

    const url = await this.supabaseService.uploadFile(file, 'main-images');

    if (!url) {
      throw new Error('Main image upload failed');
    }

    uploadedFiles.push({ bucket: 'main-images', url });
    return url;
  }

  private async uploadOtherImages(
    uploadedFiles: { bucket: string; url: string }[]
  ): Promise<string[]> {
    const files = this.postDraftService
      .getOtherImages()
      .filter((file): file is File => this.isValidFile(file))
      .slice(0, 5);

    if (!files.length) {
      return [];
    }

    const urls: string[] = [];

    for (const file of files) {
      const url = await this.supabaseService.uploadFile(file, 'additional-images');

      if (!url) {
        throw new Error('Additional image upload failed');
      }

      uploadedFiles.push({ bucket: 'additional-images', url });
      urls.push(url);
    }

    return urls;
  }

  private async uploadVideos(
    uploadedFiles: { bucket: string; url: string }[]
  ): Promise<string[]> {
    const files = this.postDraftService
      .getVideos()
      .filter((file): file is File => this.isValidFile(file))
      .slice(0, 2);

    if (!files.length) {
      return [];
    }

    const urls: string[] = [];

    for (const file of files) {
      const url = await this.supabaseService.uploadFile(file, 'videos');

      if (!url) {
        throw new Error('Video upload failed');
      }

      uploadedFiles.push({ bucket: 'videos', url });
      urls.push(url);
    }

    return urls;
  }

  private async buildCatalog(
    uploadedFiles: { bucket: string; url: string }[]
  ): Promise<Array<{ title: string; price: number; imageUrl: string }>> {
    const blocks = this.postDraftService.getServiceBlocks();
    const result: Array<{ title: string; price: number; imageUrl: string }> = [];

    for (const block of blocks) {
      if (!block.title || block.price == null) {
        continue;
      }

      let imageUrl = '';

      if (this.isValidFile(block.image)) {
        const url = await this.supabaseService.uploadFile(block.image, 'service-images');

        if (!url) {
          throw new Error('Catalog image upload failed');
        }

        uploadedFiles.push({ bucket: 'service-images', url });
        imageUrl = url;
      }

      result.push({
        title: block.title,
        price: Number(block.price),
        imageUrl
      });
    }

    return result;
  }

  private async saveUserSubscription(
    paymentPayload: {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    }
  ): Promise<void> {
    const selectedPlan = this.planData || {};

    const userUuid = await this.getEffectiveUserUuid();
    if (!userUuid) {
      throw new Error('Authenticated user not found');
    }

    const { data: dbUser, error: dbUserError } = await this.supabaseService.supabase
      .from('users')
      .select('userid')
      .or(`supabase_uid.eq.${userUuid},auth_user_id.eq.${userUuid},user_id.eq.${userUuid}`)
      .maybeSingle();

    if (dbUserError || !dbUser) {
      throw new Error(dbUserError?.message || 'User mapping not found');
    }

    const planKey = this.getSelectedPlanId();

    if (!planKey) {
      throw new Error('Selected plan not found');
    }

    const { data: subscriptionPlans, error: subscriptionPlanError } =
      await this.supabaseService.supabase
        .from('subscription_plans')
        .select('subscriptionplanid')
        .eq('plan_id', planKey);

    if (subscriptionPlanError) {
      throw new Error(
        subscriptionPlanError.message || 'Subscription plan lookup failed'
      );
    }

    if (!subscriptionPlans || subscriptionPlans.length === 0) {
      throw new Error(`No subscription plan found for plan_id: ${planKey}`);
    }

    if (subscriptionPlans.length > 1) {
      throw new Error(`Multiple subscription plans found for plan_id: ${planKey}`);
    }

    const subscriptionPlan = subscriptionPlans[0];

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + Number(selectedPlan.duration_days || 0));

    const totalAds = Number(selectedPlan.total_ads ?? 1);
    const remainingAds = Number(selectedPlan.remaining_ads ?? totalAds);

    const { error: insertSubscriptionError } = await this.supabaseService.supabase
      .from('user_subscriptions')
      .insert([
        {
          userid: dbUser.userid,
          subscriptionplanid: subscriptionPlan.subscriptionplanid,
          startdate: startDate.toISOString(),
          enddate: endDate.toISOString(),
          amountpaid: Number(selectedPlan.amount || selectedPlan.price || 0),
          paymentstatus: 'paid',
          isactive: true,
          createdon: new Date().toISOString(),
          total_ads: totalAds,
          remaining_ads: remainingAds,
          plan_uuid: null,
          razorpay_payment_id: paymentPayload.razorpay_payment_id || null,
          razorpay_order_id: paymentPayload.razorpay_order_id || null,
          razorpay_signature: paymentPayload.razorpay_signature || null,
          auth_user_id: userUuid
        }
      ]);

    if (insertSubscriptionError) {
      throw insertSubscriptionError;
    }
  }

  private async saveBoostEntry(
    paymentPayload: {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    } = {}
  ): Promise<void> {
    const postId = Number(this.postData?.postid || 0);
    if (!postId) {
      throw new Error('Post id not found for featured ad');
    }

    const planId = this.getSelectedPlanId();
    const planName = this.getSelectedPlanName();
    const durationDays = Number(this.planData?.duration_days || 0);
    const amount = Number(this.planData?.amount || this.planData?.price || 0);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + durationDays);

    const boostPayload = {
      userid: this.postData?.userid ?? null,
      postid: postId,
      boost_plan_id: planId,
      boost_name: planName,
      price: amount,
      duration_days: durationDays,
      startdate: startDate.toISOString(),
      enddate: endDate.toISOString(),
      isactive: true,
      createdon: new Date().toISOString(),
      razorpay_payment_id: paymentPayload.razorpay_payment_id || null,
      razorpay_order_id: paymentPayload.razorpay_order_id || null,
      razorpay_signature: paymentPayload.razorpay_signature || null
    };

    const { error } = await this.supabaseService.supabase
      .from('post_boosts')
      .insert([boostPayload]);

    if (error) {
      console.warn('post_boosts insert skipped/failed:', error);
    }
  }

  private async updateExistingPostAsFeatured(
    paymentPayload: {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    } = {}
  ): Promise<void> {
    const postId = Number(this.postData?.postid || 0);

    if (!postId) {
      throw new Error('Post id not found');
    }

    const selectedPlanId = this.getSelectedPlanId();
    const selectedPlanName = this.getSelectedPlanName();
    const selectedIsFeatured = this.getSelectedPlanIsFeatured();

    const updatePayload: any = {
      isfeatured: selectedIsFeatured,
      is_featured: selectedIsFeatured,
      featured_plan_id: selectedPlanId,
      featured_plan_name: selectedPlanName,
      status: this.postData?.status || 'Active',
      isactive: true
    };

    const { error } = await this.supabaseService.supabase
      .from('post')
      .update(updatePayload)
      .eq('postid', postId);

    if (error) {
      throw error;
    }

    await this.saveBoostEntry(paymentPayload);
  }

  private async insertNewPostAfterPayment(
    paymentPayload: {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    } = {}
  ): Promise<void> {
    const uploadedFiles: { bucket: string; url: string }[] = [];

    try {
      const pendingPost = this.postData || {};
      const selectedPlanId = this.getSelectedPlanId();
      const selectedPlanName = this.getSelectedPlanName();
      const selectedIsFeatured = this.getSelectedPlanIsFeatured();

      const mainPhoto = await this.uploadMainPhoto(uploadedFiles);
      const otherImages = await this.uploadOtherImages(uploadedFiles);
      const videos = await this.uploadVideos(uploadedFiles);
      const catalog = await this.buildCatalog(uploadedFiles);

      const oldImageUrls = this.parseJsonArray<string>(pendingPost.image_urls);
      const oldVideoUrls = this.parseJsonArray<string>(pendingPost.video_urls);
      const oldCatalog = this.parseJsonArray<any>(pendingPost.catalog);

      const finalPayload: any = {
        ...pendingPost,

        image_url: mainPhoto || pendingPost.image_url || '',
        image_urls: otherImages.length ? otherImages : oldImageUrls,
        video_url: videos[0] || pendingPost.video_url || '',
        video_urls: videos.length ? videos : oldVideoUrls,
        catalog: catalog.length ? catalog : oldCatalog,

        isfeatured: selectedIsFeatured,
        is_featured: selectedIsFeatured,
        featured_plan_id: selectedPlanId,
        featured_plan_name: selectedPlanName,

        adtype: pendingPost.conditiontype || pendingPost.adtype || null,
        conditiontype: pendingPost.conditiontype || pendingPost.adtype || null,

        status: 'Active',
        isactive: true,
        currencycode: pendingPost.currencycode || 'INR'
      };

      delete finalPayload.postid;
      delete finalPayload.id;

      

      const { error } = await supabase
        .from('post')
        .insert([finalPayload]);

      if (error) {
        throw error;
      }

      if (this.isSubscriptionPlanFlow()) {
        await this.saveUserSubscription(paymentPayload);
      }
    } catch (error: any) {
      console.error('Payment/save error:', error);

      for (const file of uploadedFiles.reverse()) {
        try {
          await this.supabaseService.deleteFileByPublicUrl(file.url, file.bucket);
        } catch (deleteErr) {
          console.error('Failed to cleanup uploaded file:', deleteErr);
        }
      }

      throw error;
    }
  }

  private async savePostAfterPayment(
    paymentPayload: {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    } = {}
  ): Promise<void> {
    try {
      if (this.isExistingPostFeaturedFlow()) {
        await this.updateExistingPostAsFeatured(paymentPayload);
      } else {
        await this.insertNewPostAfterPayment(paymentPayload);
      }

      this.clearVerifiedPaymentState();

      localStorage.removeItem('pending_post_payload');
      localStorage.removeItem('selected_plan_payload');
      localStorage.removeItem('pending_service_catalog_payload');
      localStorage.removeItem('pending_post_flow');
      localStorage.removeItem('pending_post_type');
      localStorage.removeItem('pending_post_userid');
      localStorage.removeItem(this.featureEditContextStorageKey);

      this.postDraftService.clearDraft();
  this.paymentSuccess.set(true);
this.paymentFailed.set(false);
this.errorMessage.set('');

this.snackbar.show('Payment successful & post saved!', 'success');
    } catch (error: any) {
      console.error('Final savePostAfterPayment error:', error);
      this.paymentFailed.set(true);
     const msg = error?.message || 'Payment succeeded but post saving failed.';
this.errorMessage.set(msg);
this.snackbar.show(msg, 'error');
      throw error;
    }
  }

  private async verifyPaymentOnBackend(payload: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }): Promise<void> {
    const accessToken = await this.getAccessToken();
    const userUuid = await this.getEffectiveUserUuid();
    const selectedPlanId = this.getSelectedPlanId();
    const selectedPlanName = this.getSelectedPlanName();

    const verifyPayload = {
      plan_id: selectedPlanId,
      plan_name: selectedPlanName,
      amount: this.amount,
      currency: 'INR',
      receipt: `post_${Date.now()}`,
      razorpay_payment_id: payload.razorpay_payment_id,
      razorpay_order_id: payload.razorpay_order_id,
      razorpay_signature: payload.razorpay_signature,
      user_id: this.postData?.userid ?? userUuid ?? null,
      post_payload: this.postData || {},
      plan_payload: this.planData || {},
      ad_type: this.adType
    };

   

    const invokeOptions: any = {
      headers: {
        'Content-Type': 'application/json'
      },
      body: verifyPayload
    };

    if (accessToken) {
      invokeOptions.headers.Authorization = `Bearer ${accessToken}`;
    }

    const { data, error } = await supabase.functions.invoke('verify-payment', invokeOptions);

    

    if (error) {
      const detailedMessage = await this.readEdgeFunctionError(error);

      if (this.isFeaturedPlanFlow()) {
        console.warn('Featured/Boost verification skipped due to backend error:', detailedMessage);
        return;
      }

      throw new Error(detailedMessage || 'Payment verification failed');
    }

    if (!data || data.success !== true) {
      if (this.isFeaturedPlanFlow()) {
        console.warn('Featured/Boost verification returned no success. Continuing post save.');
        return;
      }

      throw new Error(
        data?.error?.toString() ||
        data?.message?.toString() ||
        'Payment verification failed'
      );
    }
  }

  async payNow(): Promise<void> {
    if (!this.isBrowser) return;

    if (!this.postData) {
    const msg = 'Post data missing. Please go back and submit again.';
this.errorMessage.set(msg);
this.snackbar.show(msg, 'error');

      return;
    }

    if (!this.amount || this.amount <= 0) {
     const msg = 'Invalid payment amount.';
this.errorMessage.set(msg);
this.snackbar.show(msg, 'error');
      return;
    }

    if (!window.Razorpay) {
     const msg = 'Razorpay SDK not loaded. Please refresh and try again.';
this.errorMessage.set(msg);
this.snackbar.show(msg, 'error');
      return;
    }

    this.isPaying.set(true);
    this.paymentFailed.set(false);
    this.errorMessage.set('');

    try {
      const effectiveSession = await this.supabaseService.getEffectiveAuthUser();
      const accessToken = await this.getAccessToken();
      const selectedPlanId = this.getSelectedPlanId();
      const selectedPlanName = this.getSelectedPlanName();

  

      if (!effectiveSession.isAuthenticated) {
        throw new Error('Login session expired. Please login again.');
      }

      const invokeOptions: any = {
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          plan_id: selectedPlanId,
          plan_name: selectedPlanName,
          amount: Math.round(this.amount * 100),
          currency: 'INR',
          receipt: `post_${Date.now()}`
        }
      };

      if (accessToken) {
        invokeOptions.headers.Authorization = `Bearer ${accessToken}`;
      }

      const { data, error } = await supabase.functions.invoke('create-order', invokeOptions);

  

      if (error) {
        throw new Error(error.message || 'Unable to create order');
      }

      if (!data || !data.orderId) {
        throw new Error('Failed to create Razorpay order');
      }

      const options = {
        key: this.razorpayKey,
        amount: Math.round(this.amount * 100),
        currency: 'INR',
        name: 'AmiHub',
        description: this.planName,
        order_id: data.orderId,
        prefill: {
          name: this.sellerName,
          email: this.sellerEmail,
          contact: this.sellerPhone
        },
        notes: {
          post_title: this.postTitle,
          plan_name: this.planName,
          ad_type: this.adType
        },
        theme: {
          color: '#1f4bff'
        },
        modal: {
          ondismiss: () => {
            this.isPaying.set(false);
          }
        },
        handler: async (paymentResponse: any) => {
          this.isPaying.set(true);
          this.errorMessage.set('');
          this.paymentFailed.set(false);

          try {
            await this.verifyPaymentOnBackend({
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_signature: paymentResponse.razorpay_signature
            });

            this.saveVerifiedPaymentState({
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_signature: paymentResponse.razorpay_signature
            });

            await this.savePostAfterPayment({
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_signature: paymentResponse.razorpay_signature
            });
          } catch (error: any) {
            console.error('Verification/Post save failed:', error);
            this.paymentFailed.set(true);
            const msg = error?.message || 'Payment succeeded but post saving failed.';
this.errorMessage.set(msg);
this.snackbar.show(msg, 'error');
          } finally {
            this.isPaying.set(false);
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on('payment.failed', (failureResponse: any) => {
        console.error('Razorpay payment failed:', failureResponse);
        this.paymentFailed.set(true);
      const msg = failureResponse?.error?.description || 'Payment failed. Please try again.';
this.errorMessage.set(msg);
this.snackbar.show(msg, 'error');
        this.isPaying.set(false);
      });

      razorpayInstance.open();
    } catch (error: any) {
      console.error('Pay now error:', error);
      this.paymentFailed.set(true);
    const msg = error?.message || 'Unable to start payment.';
this.errorMessage.set(msg);
this.snackbar.show(msg, 'error');
      this.isPaying.set(false);
    }
  }

  async retrySavePost(): Promise<void> {
    if (!this.isBrowser) return;

    const raw = localStorage.getItem(this.verifiedPaymentStorageKey);

    if (!raw) {
      this.errorMessage.set('Verified payment record not found. Please contact support before paying again.');
      return;
    }

    const verifiedPayment = JSON.parse(raw);

    this.isRetryingSave.set(true);
    this.paymentFailed.set(false);
    this.errorMessage.set('');

    try {
      await this.savePostAfterPayment({
        razorpay_payment_id: verifiedPayment?.razorpay_payment_id,
        razorpay_order_id: verifiedPayment?.razorpay_order_id,
        razorpay_signature: verifiedPayment?.razorpay_signature
      });
    } catch (error: any) {
      console.error('Retry save failed:', error);
      this.paymentFailed.set(true);
      this.errorMessage.set(
        error?.message || 'Post save retry failed.'
      );
    } finally {
      this.isRetryingSave.set(false);
    }
  }

  goBackToPlans(): void {
    this.router.navigate(['/subscription-plan']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goToMyAds(): void {
    this.router.navigate(['/my-ads']);
  }

  retryPayment(): void {
    this.paymentFailed.set(false);
    this.errorMessage.set('');
    this.payNow();
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value || 0);
  }
}