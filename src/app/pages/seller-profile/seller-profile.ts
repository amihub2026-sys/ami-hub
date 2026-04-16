import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-seller-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seller-profile.html',
  styleUrls: ['./seller-profile.css']
})
export class SellerProfileComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);

  seller: any = {
    name: '',
    email: '',
    phone: '',
    accountType: '',
    category: '',
    profileImage: null,
    kycImage: null,
    qrCodeImage: null,
    rating: 4,
    verified: true,
    termsAccepted: false
  };

  stars = [1, 2, 3, 4, 5];
  accountTypes = ['Individual', 'Business'];
  categories = ['Electronics', 'Fashion', 'Home & Living', 'Automotive'];
  redirectTo: string = '';
  isLoading = false;
  isEditMode = false;
  authChecked = false;

  private hasLoadedProfile = false;
  private authSubscription: { unsubscribe: () => void } | null = null;
  private destroyed = false;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  get submitButtonText(): string {
    return this.isEditMode ? 'Edit Profile' : 'Create Profile';
  }

  async ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      this.redirectTo = nav.extras.state['next'] || '';
    }

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Listen for auth restore/login and reload immediately inside Angular zone
    const { data } = this.supabaseService.supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await this.zone.run(async () => {
          if (this.destroyed) return;

          if (session?.user) {
            await this.loadSellerProfile(true);
          } else if (this.authChecked && !this.hasLoadedProfile) {
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      }
    );

    this.authSubscription = data?.subscription ?? null;

    // First load
    await this.loadSellerProfile(false);

    // Safety retry for slow session restore
    setTimeout(async () => {
      if (!this.destroyed && !this.hasLoadedProfile) {
        await this.zone.run(async () => {
          await this.loadSellerProfile(true);
        });
      }
    }, 1200);

    // Second safety retry
    setTimeout(async () => {
      if (!this.destroyed && !this.hasLoadedProfile) {
        await this.zone.run(async () => {
          await this.loadSellerProfile(true);
        });
      }
    }, 2200);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.authSubscription?.unsubscribe();
  }

  async loadSellerProfile(forceRetry: boolean = false) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.destroyed) return;
    if (this.isLoading && !forceRetry) return;
    if (this.hasLoadedProfile && !forceRetry) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      await this.supabaseService.waitForSession(2500);

      let user = await this.supabaseService.getCurrentUser();

      if (!user) {
        await this.delay(600);
        user = await this.supabaseService.getCurrentUser();
      }

      if (!user) {
        this.authChecked = true;
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }

      let result = await this.supabaseService.createOrGetSellerProfileFromUsers();

      if (result.error || !result.data) {
        await this.delay(500);
        result = await this.supabaseService.createOrGetSellerProfileFromUsers();
      }

      const profile = result.data;
      const error = result.error;
      const isNew = result.isNew === true;

      if (error) {
        console.error('Profile create/load error:', error);
        this.authChecked = true;
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }

      this.zone.run(() => {
        this.seller = {
          ...this.seller,
          name:
            profile?.name ||
            profile?.fullname ||
            user?.user_metadata?.['full_name'] ||
            user?.user_metadata?.['name'] ||
            '',
          email: profile?.email || user?.email || '',
          phone: profile?.phone_number || profile?.phonenumber || '',
          accountType: profile?.accounttype || '',
          category: profile?.category || '',
          profileImage: profile?.profileimageurl || profile?.avatar_url || null,
          kycImage: profile?.kycimage || null,
          qrCodeImage: profile?.qrcodeimage || null,
          rating: profile?.rating ?? 4,
          verified: profile?.isverified ?? true,
          termsAccepted: profile?.termsaccepted ?? false
        };

        this.isEditMode = !isNew && this.hasExistingProfileData(profile);
        this.hasLoadedProfile = true;
        this.authChecked = true;
        this.isLoading = false;

        this.cdr.detectChanges();
      });
    } catch (err) {
      console.error('Seller profile load error:', err);

      this.zone.run(() => {
        this.authChecked = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    }
  }

  uploadProfileImage(event: Event) {
    this.readFile(event, 'profileImage');
  }

  uploadKYC(event: Event) {
    this.readFile(event, 'kycImage');
  }

  uploadQR(event: Event) {
    this.readFile(event, 'qrCodeImage');
  }

  readFile(event: Event, key: string) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      this.zone.run(() => {
        this.seller[key] = reader.result as string;
        this.cdr.detectChanges();
      });
    };

    reader.readAsDataURL(file);
  }

  removeProfileImage() {
    this.seller.profileImage = null;
    this.cdr.detectChanges();
  }

  async submitProfile() {
    if (!this.seller.termsAccepted) {
      this.showMessage('Accept Terms');
      return;
    }

    if (!isPlatformBrowser(this.platformId)) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      await this.supabaseService.waitForSession(1500);
      await this.supabaseService.upsertSellerProfileToUsers(this.seller);

      this.zone.run(() => {
        this.isEditMode = true;
        this.hasLoadedProfile = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      });

      this.showMessage('Profile saved successfully');

      if (this.redirectTo === 'post-service') {
        await this.router.navigate(['/service']);
      } else if (this.redirectTo === 'post-product') {
        await this.router.navigate(['/post-ad']);
      } else if (this.redirectTo === 'post-ad') {
        await this.router.navigate(['/post-ad']);
      } else {
        await this.router.navigate(['/']);
      }
    } catch (err) {
      console.error('Error saving profile:', err);

      this.zone.run(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      });

      this.showMessage('Failed to save profile');
    }
  }

  private hasExistingProfileData(profile: any): boolean {
    if (!profile) return false;

    return !!(
      profile?.phonenumber ||
      profile?.phone_number ||
      profile?.accounttype ||
      profile?.category ||
      profile?.profileimageurl ||
      profile?.avatar_url ||
      profile?.kycimage ||
      profile?.qrcodeimage ||
      profile?.termsaccepted
    );
  }

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private showMessage(message: string) {
    if (isPlatformBrowser(this.platformId)) {
      alert(message);
    } else {
      console.log(message);
    }
  }
}