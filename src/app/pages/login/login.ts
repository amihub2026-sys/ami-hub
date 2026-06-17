import { Component, Inject, OnInit, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { SnackbarService } from '../../services/snackbar.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  userLoginMethod: 'emailOtp' | 'mobileOtp' | 'username' | 'admin' = 'mobileOtp';

  mobile = '';
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
  private snackbar: SnackbarService,
  private cdr: ChangeDetectorRef,
  @Inject(PLATFORM_ID) private platformId: Object
) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    this.redirectTo = nav?.extras?.state?.['redirectTo'] || '/';

    if (!this.isBrowser) return;

    const googleLoginPending = localStorage.getItem('googleLoginPending');
    const savedRedirectTo = localStorage.getItem('redirectToAfterLogin');

    if (savedRedirectTo) this.redirectTo = savedRedirectTo;
    if (googleLoginPending !== 'true') return;

    const { data: sessionData } =
      await this.supabaseService.supabase.auth.getSession();

    if (!sessionData.session) {
      localStorage.removeItem('googleLoginPending');
      localStorage.removeItem('redirectToAfterLogin');
      return;
    }

    const { data, error } =
      await this.supabaseService.syncGoogleUserToPublicUsers();

    localStorage.removeItem('googleLoginPending');

    if (error || !data) {
      console.error('Google login sync failed:', error);
      return;
    }

    this.storeUserSession(data);
    this.showAlert('Login Successful', 'success');

    setTimeout(async () => {
      await this.redirectAfterLogin(data);
    }, 1200);
  }

  selectUserLogin(method: 'emailOtp' | 'mobileOtp' | 'username' | 'admin') {
    this.userLoginMethod = method;
    this.resetFields();
  }

  resetFields() {
    this.mobile = '';
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

  closeAd(type: 'left' | 'right') {
    if (type === 'left') {
      this.showLeftAd = false;
    } else {
      this.showRightAd = false;
    }
  }

  private showAlert(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.snackbar.show(message, type);
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
      const { data, error } =
        await this.supabaseService.getUserByEmail(cleaned);
      return { data, error };
    }

    const { data, error } =
      await this.supabaseService.getUserByUsername(cleaned);

    return { data, error };
  }

  async loginWithEmailPassword() {
  const identifier = this.email.trim().toLowerCase();
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

    if ((data.password || '').trim() !== enteredPassword) {
      this.showAlert('Invalid password');
      return;
    }

    this.storeUserSession(data);
    this.showAlert('Login Successful', 'success');

    setTimeout(async () => {
      await this.redirectAfterLogin(data);
    }, 1200);
  }

  async sendMobileOtp() {
  const phone = this.mobile.trim();

  if (!/^[6-9]\d{9}$/.test(phone)) {
    this.showAlert('Enter valid 10 digit mobile number', 'error');
    return;
  }

  console.log('SENDING OTP TO:', phone);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const res = await fetch(
    'https://jhojcdhnsfqmroyfotyp.supabase.co/functions/v1/send-sms-hook',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: `91${phone}`,
        otp: otp
      })
    }
  );

  const result = await res.json();
  console.log('OTP RESPONSE:', result);

  if (!res.ok) {
    this.showAlert(result.error || 'OTP sending failed', 'error');
    return;
  }

  localStorage.setItem('login_otp', otp);
  console.log('NEW OTP STORED:', otp);
  localStorage.setItem('login_mobile', phone);

  this.otpSent = true;
  this.cdr.detectChanges();
  this.showAlert('OTP sent successfully', 'success');
}
  async verifyMobileOtp() {
  const phone = this.mobile.trim();
  const otpCode = this.otp.trim();

  const savedOtp = localStorage.getItem('login_otp');
  const savedMobile = localStorage.getItem('login_mobile');

  if (!otpCode) {
    this.showAlert('Enter OTP', 'error');
    return;
  }

  console.log('ENTERED OTP:', otpCode);
console.log('SAVED OTP:', savedOtp);

console.log('ENTERED PHONE:', phone);
console.log('SAVED PHONE:', savedMobile);

if (
  savedMobile?.trim() !== phone.trim() ||
  savedOtp?.trim() !== otpCode.trim()
) {
  console.log('OTP CHECK FAILED');

  console.log('savedMobile:', savedMobile);
  console.log('phone:', phone);

  console.log('savedOtp:', savedOtp);
  console.log('otpCode:', otpCode);

  this.showAlert('Invalid OTP', 'error');
  return;
}

const { data: users, error: userError } =
  await this.supabaseService.supabase
    .from('users')
    .select('*')
    .or(`phonenumber.eq.${phone},phone_number.eq.${phone}`);

console.log('USERS:', users);
console.log('USER ERROR:', userError);

const existingUser =
  users && users.length > 0
    ? users[0]
    : null;

  if (existingUser) {

localStorage.removeItem('login_otp');
  localStorage.removeItem('login_mobile');

  this.storeUserSession(existingUser);

  localStorage.setItem('userToken', 'loggedUser');
  localStorage.setItem('mobile', phone);

  this.showAlert('Login successful', 'success');

  setTimeout(async () => {
    await this.redirectAfterLogin(existingUser);
  }, 1000);

  return;
}

/* CREATE NEW USER */


const newAuthId = crypto.randomUUID();

const { data: newUser, error: insertError } =
  await this.supabaseService.supabase
    .from('users')
    .insert([
      {
        phonenumber: phone,
        phone_number: phone,
        fullname: 'New User',
        name: 'New User',
        username: `user_${phone}`,

        user_id: newAuthId,
        supabase_uid: newAuthId,
        auth_user_id: newAuthId,

        isactive: true,
        isverified: true,
        isonboardingcompleted: false,
        createdon: new Date().toISOString()
      }
    ])
    .select()
    .single();



if (insertError) {

  console.log('INSERT ERROR FULL:', insertError);

  alert(JSON.stringify(insertError));

  console.error(insertError);

  this.showAlert(insertError.message || 'User creation failed', 'error');

  return;
}

localStorage.removeItem('login_otp');
localStorage.removeItem('login_mobile');

this.storeUserSession(newUser);
localStorage.setItem('supabase_uid', newUser.supabase_uid || newUser.auth_user_id || newUser.user_id);

localStorage.setItem('userToken', 'loggedUser');
localStorage.setItem('mobile', phone);

this.showAlert('Please complete profile setup', 'success');

setTimeout(async () => {
  await this.router.navigate(['/profile-setup']);
}, 1000);
}

  async loginAdmin() {
    if (!this.adminUsername || !this.adminPassword) {
      this.showAlert('Enter admin username and password');
      return;
    }

    const { data, error } =
      await this.supabaseService.getAdminByUsername(this.adminUsername.trim());

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

    this.showAlert('Admin Login Successful', 'success');

    setTimeout(async () => {
      await this.router.navigate(['/admin-page']);
    }, 1200);
  }

  async sendOtp() {
    if (!this.email) {
      this.showAlert('Enter email');
      return;
    }

    const { data, error } =
      await this.supabaseService.getUserByEmail(this.email.trim());

    if (error || !data) {
      this.showAlert('Email not found');
      return;
    }

    const generatedOtp =
      Math.floor(100000 + Math.random() * 900000).toString();

    const expiry = Date.now() + 5 * 60 * 1000;

    await this.supabaseService.updateUserOtpByEmail(
      this.email.trim(),
      generatedOtp,
      expiry
    );

    this.showAlert('OTP sent! Check console for testing');
    this.otpSent = true;
    this.startTimer();
  }

  async verifyOtp() {
    if (!this.otp) {
      this.showAlert('Enter OTP');
      return;
    }

    const { data, error } =
      await this.supabaseService.getUserByEmail(this.email.trim());

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

    const email = this.email.trim().toLowerCase();
    const password = this.newPassword.trim();

    const { error: signUpError } =
      await this.supabaseService.supabase.auth.signUp({
        email,
        password
      });

    if (
      signUpError &&
      !signUpError.message.toLowerCase().includes('already registered')
    ) {
      this.showAlert(signUpError.message);
      return;
    }

    await this.supabaseService.updateUserPasswordByEmail(email, password);

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

      const { error } =
        await this.supabaseService.signInWithOAuth('google');

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
