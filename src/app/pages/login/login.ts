import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  userLoginMethod: 'emailOtp' | 'username' = 'username';

  email = '';
  password = '';
  newPassword = '';
  otp = '';
  otpSent = false;
  showPasswordSet = false;

  countdown = 0;
  timer: any;

  private isBrowser = false;
  private redirectTo = '/';
  showRightAd = true;
 showLeftAd = true;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
closeAd(type: 'left' | 'right') {
  if (type === 'left') {
    this.showLeftAd = false;
  } else {
    this.showRightAd = false;
  }
}
  async ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    this.redirectTo = nav?.extras?.state?.['redirectTo'] || '/';

    if (!this.isBrowser) return;

    const googleLoginPending = localStorage.getItem('googleLoginPending');
    const savedRedirectTo = localStorage.getItem('redirectToAfterLogin');

    if (savedRedirectTo) {
      this.redirectTo = savedRedirectTo;
    }

    if (googleLoginPending !== 'true') return;

    const { data: sessionData } = await this.supabaseService.supabase.auth.getSession();

    if (!sessionData.session) {
      localStorage.removeItem('googleLoginPending');
      localStorage.removeItem('redirectToAfterLogin');
      return;
    }

    const { data, error } = await this.supabaseService.syncGoogleUserToPublicUsers();

    localStorage.removeItem('googleLoginPending');

    if (error || !data) {
      console.error('Google login sync failed:', error);
      return;
    }

    this.storeUserSession(data);
    await this.redirectAfterLogin(data);
  }

  selectUserLogin(method: 'emailOtp' | 'username') {
    this.userLoginMethod = method;
    this.resetFields();
  }

  resetFields() {
    this.email = '';
    this.password = '';
    this.newPassword = '';
    this.otp = '';
    this.otpSent = false;
    this.showPasswordSet = false;
    clearInterval(this.timer);
  }

  private storeUserSession(data: any) {
    if (!this.isBrowser) return;

    localStorage.setItem('userToken', 'loggedUser');
    localStorage.removeItem('adminToken');

    localStorage.setItem('userId', String(data.userid));
    localStorage.setItem('userEmail', data.email || '');
    localStorage.setItem('userName', data.fullname || '');
  localStorage.setItem('userTypeId', String(data.usertypeid || ''));
  }

  private isSellerProfileComplete(user: any): boolean {
    return !!(user.fullname && user.email && user.phonenumber);
  }

  private normalizeTargetRoute(route: string): string {
    if (!route || route === '/') return '/';
    return route.startsWith('/') ? route : `/${route}`;
  }

  private normalizeNextRoute(route: string): string {
    if (!route || route === '/') return 'post-ad';
    return route.startsWith('/') ? route.replace('/', '') : route;
  }

private async redirectAfterLogin(user: any) {
  const onboardingDone = user.isonboardingcompleted === true;

  if (!onboardingDone) {
    localStorage.removeItem('redirectToAfterLogin');
    await this.router.navigate(['/account-setup']);
    return;
  }

  const target = this.normalizeTargetRoute(this.redirectTo);
  localStorage.removeItem('redirectToAfterLogin');
  await this.router.navigate([target]);
}

  async loginWithEmailPassword() {
    if (!this.email || !this.password) {
      alert('Enter email and password');
      return;
    }

    const { data, error } = await this.supabaseService.getUserByEmail(this.email.trim());

    if (error || !data) {
      alert('User not found');
      return;
    }

    if (!data.isactive) {
      alert('User account is inactive');
      return;
    }

    if (data.password !== this.password.trim()) {
      alert('Invalid password');
      return;
    }

    this.storeUserSession(data);
    alert('Login Successful');
    await this.redirectAfterLogin(data);
  }

  async sendOtp() {
    if (!this.email) {
      alert('Enter email');
      return;
    }

    const { data, error } = await this.supabaseService.getUserByEmail(this.email.trim());

    if (error || !data) {
      alert('Email not found');
      return;
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000;

    await this.supabaseService.updateUserOtpByEmail(this.email.trim(), generatedOtp, expiry);

    console.log('Generated OTP (for testing):', generatedOtp);
    alert('OTP sent! Check console for testing');

    this.otpSent = true;
    this.startTimer();
  }

  async verifyOtp() {
    if (!this.otp) {
      alert('Enter OTP');
      return;
    }

    const { data, error } = await this.supabaseService.getUserByEmail(this.email.trim());

    if (error || !data) {
      alert('Email not found');
      return;
    }

    const now = Date.now();

    if (data.otp !== this.otp.trim()) {
      alert('Invalid OTP');
      return;
    }

    if (now > Number(data.otp_expired)) {
      alert('OTP expired');
      return;
    }

    this.showPasswordSet = true;
  }

  async setPassword() {
    if (!this.newPassword) {
      alert('Enter new password');
      return;
    }

    await this.supabaseService.updateUserPasswordByEmail(this.email.trim(), this.newPassword);

    alert('Password set! You can now login using email/password.');
    this.password = this.newPassword;
    this.showPasswordSet = false;
    this.userLoginMethod = 'username';
  }

  startTimer() {
    this.countdown = 30;

    this.timer = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        clearInterval(this.timer);
      }
    }, 1000);
  }

  async googleLogin() {
    try {
      if (this.isBrowser) {
        localStorage.setItem('googleLoginPending', 'true');
        localStorage.setItem('redirectToAfterLogin', this.redirectTo);
      }

      const { error } = await this.supabaseService.signInWithOAuth('google');

      if (error) {
        if (this.isBrowser) {
          localStorage.removeItem('googleLoginPending');
          localStorage.removeItem('redirectToAfterLogin');
        }
        alert(error.message);
      }
    } catch (err: any) {
      if (this.isBrowser) {
        localStorage.removeItem('googleLoginPending');
        localStorage.removeItem('redirectToAfterLogin');
      }
      alert(err.message || 'Google login failed');
    }
  }
}