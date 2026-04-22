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
    username: '',
    password: '',
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
  showPassword = false;

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

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  async ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      this.redirectTo = nav.extras.state['next'] || '';
    }

    if (!this.isBrowser()) {
      return;
    }

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

    await this.loadSellerProfile(false);

    setTimeout(async () => {
      if (!this.destroyed && !this.hasLoadedProfile) {
        await this.zone.run(async () => {
          await this.loadSellerProfile(true);
        });
      }
    }, 1200);

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
    if (!this.isBrowser()) return;
    if (this.destroyed) return;
    if (this.isLoading && !forceRetry) return;
    if (this.hasLoadedProfile && !forceRetry) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      await this.supabaseService.waitForSession(2500);

      const session = await this.supabaseService.getEffectiveAuthUser();

      if (!session.isAuthenticated) {
        this.authChecked = true;
        this.isLoading = false;
        this.cdr.detectChanges();
        return;
      }

      if (!session.authUser && session.userid) {
        const { data: profileById, error: profileError } =
          await this.supabaseService.getUserById(Number(session.userid));

        if (profileError) {
          console.error('Profile load by local user id error:', profileError);
          this.authChecked = true;
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        this.zone.run(() => {
          this.seller = {
            ...this.seller,
            name: profileById?.name || profileById?.fullname || session.name || '',
            email: profileById?.email || session.email || '',
            phone: profileById?.phone_number || profileById?.phonenumber || '',
            username: profileById?.username || session.username || '',
            password: profileById?.password || '',
            accountType: profileById?.accounttype || '',
            category: profileById?.category || '',
            profileImage: profileById?.profileimageurl || profileById?.avatar_url || null,
            kycImage: profileById?.kycimage || null,
            qrCodeImage: profileById?.qrcodeimage || null,
            rating: profileById?.rating ?? 4,
            verified: profileById?.isverified ?? true,
            termsAccepted: profileById?.termsaccepted ?? false
          };

          this.isEditMode = this.hasExistingProfileData(profileById);
          this.hasLoadedProfile = true;
          this.authChecked = true;
          this.isLoading = false;

          this.cdr.detectChanges();
        });

        return;
      }

      let user = session.authUser;

      if (!user) {
        await this.delay(600);
        const retrySession = await this.supabaseService.getEffectiveAuthUser();
        user = retrySession.authUser;
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
            session.name ||
            '',
          email: profile?.email || user?.email || session.email || '',
          phone: profile?.phone_number || profile?.phonenumber || '',
          username: profile?.username || session.username || '',
          password: profile?.password || '',
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
    // ✅ ADD THIS ONLY
if (this.seller.phone && !/^\d{10}$/.test(this.seller.phone)) {
  this.showMessage('Phone number must be exactly 10 digits');
  return;
}

    if (!this.isBrowser()) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const session = await this.supabaseService.getEffectiveAuthUser();

      if (!session.isAuthenticated) {
        this.showMessage('Please login first');
        this.router.navigate(['/login']);
        return;
      }

      if (!session.authUser && session.userid) {
        const payload = {
          fullname: this.seller.name || '',
          name: this.seller.name || '',
          email: this.seller.email || '',
          phonenumber: this.seller.phone || '',
          phone_number: this.seller.phone || '',
          username: this.seller.username || '',
          password: this.seller.password || '',
          profileimageurl: this.seller.profileImage || null,
          avatar_url: this.seller.profileImage || null,
          accounttype: this.seller.accountType || '',
          category: this.seller.category || '',
          kycimage: this.seller.kycImage || null,
          qrcodeimage: this.seller.qrCodeImage || null,
          rating: this.seller.rating ?? 4,
          isverified: this.seller.verified ?? true,
          isactive: true,
          termsaccepted: this.seller.termsAccepted ?? false,
          isonboardingcompleted: true,
          updatedon: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await this.supabaseService.supabase
          .from('users')
          .update(payload)
          .eq('userid', Number(session.userid));

        if (error) {
          throw error;
        }
      } else {
        await this.supabaseService.waitForSession(1500);
        await this.supabaseService.upsertSellerProfileToUsers(this.seller);
      }

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
      profile?.username ||
      profile?.password ||
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
    if (this.isBrowser()) {
      alert(message);
    } else {
      console.log(message);
    }
  }
}