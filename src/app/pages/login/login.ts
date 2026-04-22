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
  userLoginMethod: 'emailOtp' | 'username' | 'admin' = 'username';

  email = '';
  password = '';
  newPassword = '';
  otp = '';
  otpSent = false;
  showPasswordSet = false;

  adminUsername = '';
  adminPassword = '';

  countdown = 0;
  timer: any;

  showPassword = false;
  showNewPassword = false;
  showAdminPassword = false;

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

  private showAlert(message: string) {
    if (this.isBrowser) {
      alert(message);
    } else {
      console.log(message);
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

  selectUserLogin(method: 'emailOtp' | 'username' | 'admin') {
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
    this.adminUsername = '';
    this.adminPassword = '';
    this.showPassword = false;
    this.showNewPassword = false;
    this.showAdminPassword = false;
    clearInterval(this.timer);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleNewPassword() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleAdminPassword() {
    this.showAdminPassword = !this.showAdminPassword;
  }

  private storeUserSession(data: any) {
    if (!this.isBrowser) return;

    const resolvedUuid =
      data?.supabase_uid ||
      data?.auth_user_id ||
      data?.user_id ||
      '';

    localStorage.setItem('userToken', 'loggedUser');
    localStorage.removeItem('adminToken');

    localStorage.setItem('userId', String(data.userid || ''));
    localStorage.setItem('userEmail', data.email || '');
    localStorage.setItem('userName', data.fullname || data.name || '');
    localStorage.setItem('userTypeId', String(data.usertypeid || ''));
    localStorage.setItem('username', data.username || '');

    if (resolvedUuid) {
      localStorage.setItem('supabase_uid', resolvedUuid);
    } else {
      localStorage.removeItem('supabase_uid');
    }
  }

  private normalizeTargetRoute(route: string): string {
    if (!route || route === '/') return '/';
    return route.startsWith('/') ? route : `/${route}`;
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

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private async getUserForPasswordLogin(identifier: string) {
    const cleaned = identifier.trim();

    if (!cleaned) {
      return { data: null, error: 'Empty identifier' };
    }

    if (this.isEmail(cleaned)) {
      const { data, error } = await this.supabaseService.getUserByEmail(cleaned);
      return { data, error };
    }

    const { data, error } = await this.supabaseService.getUserByUsername(cleaned);
    return { data, error };
  }

  async loginWithEmailPassword() {
    const identifier = this.email.trim();
    const enteredPassword = this.password.trim();

    if (!identifier || !enteredPassword) {
      this.showAlert('Enter email/username and password');
      return;
    }

    const { data, error } = await this.getUserForPasswordLogin(identifier);

    if (error || !data) {
      this.showAlert('User not found');
      return;
    }

    if (!data.isactive) {
      this.showAlert('User account is inactive');
      return;
    }

    if (!data.password || data.password !== enteredPassword) {
      this.showAlert('Invalid password');
      return;
    }

    const resolvedEmail = (data.email || '').trim();

    if (!resolvedEmail) {
      this.showAlert('Email not found for this user');
      return;
    }

    const { error: authError } =
      await this.supabaseService.supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: enteredPassword
      });

    if (authError) {
      console.warn('Supabase auth login failed, continuing with local session:', authError);
    }

    const { data: sessionData } =
      await this.supabaseService.supabase.auth.getSession();

    console.log('SESSION AFTER LOGIN:', sessionData.session);

    this.storeUserSession({
      ...data,
      supabase_uid:
        sessionData.session?.user?.id ||
        data?.supabase_uid ||
        data?.auth_user_id ||
        data?.user_id ||
        ''
    });

    this.showAlert('Login Successful');
    await this.redirectAfterLogin(data);
  }

  async loginAdmin() {
    if (!this.adminUsername || !this.adminPassword) {
      this.showAlert('Enter admin username and password');
      return;
    }

    const { data, error } = await this.supabaseService.getAdminByUsername(this.adminUsername.trim());

    console.log('Admin lookup result:', data, error);

    if (error || !data) {
      this.showAlert('Admin not found');
      return;
    }

    if (data.isactive === false) {
      this.showAlert('Admin account is inactive');
      return;
    }

    if (data.passwordhash !== this.adminPassword.trim()) {
      this.showAlert('Invalid admin password');
      return;
    }

    if (this.isBrowser) {
      localStorage.setItem('adminToken', 'loggedAdmin');
      localStorage.removeItem('userToken');
      localStorage.setItem('adminId', String(data.adminid || ''));
      localStorage.setItem('adminUsername', data.adminname || this.adminUsername);
    }

    this.showAlert('Admin Login Successful');
    await this.router.navigate(['/admin-page']);
  }

  async sendOtp() {
    if (!this.email) {
      this.showAlert('Enter email');
      return;
    }

    const { data, error } = await this.supabaseService.getUserByEmail(this.email.trim());

    if (error || !data) {
      this.showAlert('Email not found');
      return;
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000;

    await this.supabaseService.updateUserOtpByEmail(this.email.trim(), generatedOtp, expiry);

    console.log('Generated OTP (for testing):', generatedOtp);
    this.showAlert('OTP sent! Check console for testing');

    this.otpSent = true;
    this.startTimer();
  }

  async verifyOtp() {
    if (!this.otp) {
      this.showAlert('Enter OTP');
      return;
    }

    const { data, error } = await this.supabaseService.getUserByEmail(this.email.trim());

    if (error || !data) {
      this.showAlert('Email not found');
      return;
    }

    const now = Date.now();

    if (data.otp !== this.otp.trim()) {
      this.showAlert('Invalid OTP');
      return;
    }

    if (now > Number(data.otp_expired)) {
      this.showAlert('OTP expired');
      return;
    }

    this.showPasswordSet = true;
  }

  async setPassword() {
    if (!this.newPassword) {
      this.showAlert('Enter new password');
      return;
    }

    await this.supabaseService.updateUserPasswordByEmail(this.email.trim(), this.newPassword);

    this.showAlert('Password set! You can now login using email/password.');
    this.password = this.newPassword;
    this.showPasswordSet = false;
    this.userLoginMethod = 'username';
    this.showNewPassword = false;
    this.showPassword = false;
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
        this.showAlert(error.message);
      }
    } catch (err: any) {
      if (this.isBrowser) {
        localStorage.removeItem('googleLoginPending');
        localStorage.removeItem('redirectToAfterLogin');
      }
      this.showAlert(err.message || 'Google login failed');
    }
  }
}