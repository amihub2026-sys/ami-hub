import { Injectable } from '@angular/core';
import { SupabaseClient, User, Session } from '@supabase/supabase-js';
import { supabase } from '../../supabaseClient';

// -------------------- Interfaces --------------------
export interface Category {
  categoryid: number;
  categoryname: string;
  category_type?: string;
  iconurl?: string;
}

export interface Subcategory {
  subcategoryid: number;
  subcategoryname: string;
  categoryid: number;
}

export interface StateItem {
  stateid: number;
  countryid: number;
  statename: string;
  statecode: string;
  isactive: boolean;
}

export interface CityItem {
  cityid: number;
  stateid: number;
  cityname: string;
  citycode: string;
  isactive: boolean;
}

export interface AreaItem {
  areaid: number;
  cityid: number;
  areaname: string;
  pincode: string | null;
  isactive: boolean;
}

export interface Post {
  userid?: string;
  categoryid?: number | null;
  subcategoryid?: number | null;
  title: string;
  description: string;
  price?: number | null;
  currencycode?: string;
  adtype?: string;
  conditiontype?: string;
  status?: string;
  isfeatured?: boolean;
  featured_plan_id?: string | null;
  isactive?: boolean;
  cityid?: number | null;
  areaid?: number | null;
  contactname?: string;
  contactphone?: string;
  contactemail?: string;
  whatsappnumber?: string;
  image_url?: string;
  image_urls?: string[];
  video_url?: string;
  video_urls?: string[];
  category?: string;
  subcategory?: string;
  location?: string;
  address?: string;
  catalog?: any[];
  custom_fields?: any;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  public supabase: SupabaseClient = supabase;
  private currentUser: User | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.supabase.auth.onAuthStateChange((_event, session) => {
        this.currentUser = session?.user || null;
      });
    }
  }

  // ---------------- Helpers ----------------
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async waitForSession(maxWaitMs: number = 2000): Promise<User | null> {
    if (!this.isBrowser()) return null;

    const started = Date.now();

    while (Date.now() - started < maxWaitMs) {
      const session = await this.getCurrentSession();
      if (session?.user) {
        this.currentUser = session.user;
        return session.user;
      }
      await this.delay(150);
    }

    return null;
  }

  async getNotificationsByUser(userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('userid', userId)
      .order('createdat', { ascending: false });

    if (error) {
      console.error('Get Notifications Error:', error);
      throw error;
    }

    return data || [];
  }

  async markNotificationAsRead(notificationId: number) {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({ isread: true })
      .eq('notificationid', notificationId)
      .select();

    if (error) {
      console.error('Mark Notification Read Error:', error);
      throw error;
    }

    return data;
  }

  async markAllNotificationsAsRead(userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({ isread: true })
      .eq('userid', userId)
      .eq('isread', false)
      .select();

    if (error) {
      console.error('Mark All Notifications Read Error:', error);
      throw error;
    }

    return data;
  }

  async createNotification(payload: {
    userid: string;
    title: string;
    message: string;
    type?: string;
    refid?: string | null;
  }) {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert([{
        userid: payload.userid,
        title: payload.title,
        message: payload.message,
        type: payload.type ?? 'general',
        isread: false,
        refid: payload.refid ?? null
      }])
      .select();

    if (error) {
      console.error('Create Notification Error:', error);
      throw error;
    }

    return data;
  }

  async checkSellerProfileCompleted(): Promise<{
    completed: boolean;
    data: any;
    error: any;
  }> {
    const user = await this.getCurrentUser();

    if (!user) {
      return {
        completed: false,
        data: null,
        error: { message: 'No authenticated user found' }
      };
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking seller profile:', error);
      return {
        completed: false,
        data: null,
        error
      };
    }

    if (!data) {
      return {
        completed: false,
        data: null,
        error: null
      };
    }

    const completed = !!data.fullname && !!data.email && !!data.termsaccepted;

    return {
      completed,
      data,
      error: null
    };
  }

  // ---------------- Current Session & User ----------------
  async getCurrentSession(): Promise<Session | null> {
    if (!this.isBrowser()) {
      return null;
    }

    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        return null;
      }

      this.currentUser = data.session?.user || null;
      return data.session || null;
    } catch (error) {
      console.error('getCurrentSession failed:', error);
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.isBrowser()) {
      return null;
    }

    if (this.currentUser) return this.currentUser;

    try {
      const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();

      if (!sessionError && sessionData.session?.user) {
        this.currentUser = sessionData.session.user;
        return this.currentUser;
      }

      const waitedUser = await this.waitForSession(2000);
      if (waitedUser) {
        return waitedUser;
      }

      const { data, error } = await this.supabase.auth.getUser();

      if (error) {
        if ((error as any)?.name === 'AuthSessionMissingError') {
          return null;
        }

        console.error('Error getting current user:', error);
        return null;
      }

      this.currentUser = data.user || null;
      return this.currentUser;
    } catch (error: any) {
      if (error?.name === 'AuthSessionMissingError') {
        return null;
      }

      console.error('getCurrentUser failed:', error);
      return null;
    }
  }

  // ---------------- Seller Profiles / Users Table ----------------
  async addServiceStore(data: any): Promise<void> {
    const { error } = await this.supabase
      .from('service_store')
      .insert([data]);

    if (error) {
      console.error('Error saving service_store:', error);
      throw error;
    }
  }

  async getSellerProfileById(authUserId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', authUserId)
      .maybeSingle();

    return { data, error };
  }

  async createOrGetSellerProfileFromUsers() {
    const user = await this.getCurrentUser();

    if (!user) {
      return {
        data: null,
        error: { message: 'No authenticated user found' },
        isNew: false
      };
    }

    const userEmail = user.email || '';
    const userName =
      user.user_metadata?.['full_name'] ||
      user.user_metadata?.['name'] ||
      '';

    let { data: existingUser, error: fetchError } = await this.supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching user by supabase_uid:', fetchError);
      return { data: null, error: fetchError, isNew: false };
    }

    if (!existingUser && userEmail) {
      const { data: emailUser, error: emailError } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (emailError) {
        console.error('Error fetching user by email:', emailError);
        return { data: null, error: emailError, isNew: false };
      }

      if (emailUser) {
        const { data: linkedUser, error: linkError } = await this.supabase
          .from('users')
          .update({
            supabase_uid: user.id,
            user_id: user.id,
            updatedon: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('userid', emailUser.userid)
          .select()
          .single();

        if (linkError) {
          console.error('Error linking existing email user:', linkError);
          return { data: null, error: linkError, isNew: false };
        }

        return { data: linkedUser, error: null, isNew: false };
      }
    }

    if (existingUser) {
      return { data: existingUser, error: null, isNew: false };
    }

    const insertPayload = {
      fullname: userName || '',
      name: userName || '',
      email: userEmail,
      phonenumber: '',
      phone_number: '',
      profileimageurl: null,
      usertypeid: 1,
      isverified: true,
      isactive: true,
      createdon: new Date().toISOString(),
      updatedon: new Date().toISOString(),
      accounttype: '',
      category: '',
      kycimage: null,
      qrcodeimage: null,
      rating: 4,
      termsaccepted: false,
      avatar_url: null,
      user_id: user.id,
      updated_at: new Date().toISOString(),
      supabase_uid: user.id
    };

    const { data, error } = await this.supabase
      .from('users')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile in users table:', error);
      return { data: null, error, isNew: false };
    }

    return { data, error: null, isNew: true };
  }

  async upsertSellerProfileToUsers(seller: any) {
    const user = await this.getCurrentUser();

    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: existingUser, error: fetchError } = await this.supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing user before update:', fetchError);
      throw fetchError;
    }

    const payload = {
      fullname: seller.name || existingUser?.fullname || '',
      name: seller.name || existingUser?.name || '',
      email: seller.email || user.email || '',
      phonenumber: seller.phone || '',
      phone_number: seller.phone || '',
      profileimageurl: seller.profileImage || null,
      avatar_url: seller.profileImage || null,
      accounttype: seller.accountType || '',
      category: seller.category || '',
      kycimage: seller.kycImage || null,
      qrcodeimage: seller.qrCodeImage || null,
      rating: seller.rating ?? 4,
      isverified: seller.verified ?? true,
      isactive: true,
      termsaccepted: seller.termsAccepted ?? false,
      user_id: user.id,
      supabase_uid: user.id,
      updatedon: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingUser) {
      const { data, error } = await this.supabase
        .from('users')
        .update(payload)
        .eq('userid', existingUser.userid)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile in users table:', error);
        throw error;
      }

      return data;
    }

    const insertPayload = {
      ...payload,
      usertypeid: 1,
      createdon: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('users')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('Error inserting user profile in users table:', error);
      throw error;
    }

    return data;
  }

  // ---------------- File Upload ----------------
  async uploadFile(file: File | string, folder: string): Promise<string | null> {
    if (!file) return null;

    try {
      let fileName: string;
      let fileData: Blob;

      if (typeof file === 'string') {
        const res = await fetch(file);
        fileData = await res.blob();
        fileName = `file_${Date.now()}.jpg`;
      } else {
        fileData = file;
        fileName = `${Date.now()}_${file.name}`;
      }

      const { error } = await this.supabase.storage
        .from(folder)
        .upload(fileName, fileData, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data: urlData } = this.supabase.storage.from(folder).getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err) {
      console.error('uploadFile failed:', err);
      return null;
    }
  }

  async deleteFileByPublicUrl(publicUrl: string, bucket: string) {
    try {
      if (!publicUrl) return;

      const marker = `/storage/v1/object/public/${bucket}/`;
      const index = publicUrl.indexOf(marker);

      if (index === -1) return;

      const filePath = publicUrl.substring(index + marker.length);

      const { error } = await this.supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error(`Delete file error from bucket ${bucket}:`, error);
      }
    } catch (err) {
      console.error('deleteFileByPublicUrl failed:', err);
    }
  }

  // ---------------- Categories ----------------
  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('categoryname', { ascending: true });

    if (error) {
      console.error('Error loading categories:', error);
      return [];
    }

    return data || [];
  }

  async getSubcategories(categoryId: number): Promise<Subcategory[]> {
    const { data, error } = await this.supabase
      .from('subcategories')
      .select('*')
      .eq('categoryid', categoryId)
      .order('subcategoryname', { ascending: true });

    if (error) {
      console.error('Error loading subcategories:', error);
      return [];
    }

    return data || [];
  }

  // ---------------- Locations ----------------
  async getStates(countryId: number = 1): Promise<StateItem[]> {
    const { data, error } = await this.supabase
      .from('states')
      .select('*')
      .eq('countryid', countryId)
      .eq('isactive', true)
      .order('statename', { ascending: true });

    if (error) {
      console.error('Error loading states:', error);
      return [];
    }

    return data || [];
  }

  async getCitiesByState(stateId: number): Promise<CityItem[]> {
    const { data, error } = await this.supabase
      .from('cities')
      .select('*')
      .eq('stateid', stateId)
      .eq('isactive', true)
      .order('cityname', { ascending: true });

    if (error) {
      console.error('Error loading cities:', error);
      return [];
    }

    return data || [];
  }

  async getAreasByCity(cityId: number): Promise<AreaItem[]> {
    const { data, error } = await this.supabase
      .from('areas')
      .select('*')
      .eq('cityid', cityId)
      .eq('isactive', true)
      .order('areaname', { ascending: true });

    if (error) {
      console.error('Error loading areas:', error);
      return [];
    }

    return data || [];
  }

  // ---------------- Posts ----------------
  async createRawPost(post: any) {
    const payload = {
      userid: String(post.userid ?? ''),
      categoryid: post.categoryid ?? null,
      subcategoryid: post.subcategoryid ?? null,
      title: (post.title ?? '').trim(),
      description: (post.description ?? '').trim(),
      price: post.price ?? 0,
      currencycode: post.currencycode ?? 'INR',
      adtype: post.adtype ?? 'product',
      conditiontype: post.conditiontype ?? '',
      status: 'Processing',
      isfeatured: post.isfeatured ?? false,
      featured_plan_id: post.featured_plan_id ?? null,
      featured_plan_name: post.featured_plan_name ?? null,
      isactive: false,
      cityid: post.cityid ?? null,
      areaid: post.areaid ?? null,
      contactname: post.contactname ?? '',
      contactphone: post.contactphone ?? '',
      contactemail: post.contactemail ?? '',
      whatsappnumber: post.whatsappnumber ?? '',
      image_url: '',
      image_urls: [],
      video_url: '',
      video_urls: [],
      custom_fields: post.custom_fields ?? {},
      category: post.category ?? '',
      subcategory: post.subcategory ?? '',
      location: post.location ?? '',
      address: post.address ?? '',
      catalog: [],
      country: post.country ?? null,
      state: post.state ?? null,
      district: post.district ?? null,
      area: post.area ?? null
    };

    const { data, error } = await this.supabase
      .from('post')
      .insert([payload])
      .select('postid')
      .single();

    if (error) {
      console.error('Create Raw Post Error:', error);
      throw error;
    }

    return data;
  }

  async updatePostAfterMediaUpload(postId: number, updates: any) {
    const payload = {
      image_url: updates.image_url ?? '',
      image_urls: updates.image_urls ?? [],
      video_url: updates.video_url ?? '',
      video_urls: updates.video_urls ?? [],
      catalog: updates.catalog ?? [],
      status: 'Active',
      isactive: true,
      isfeatured: updates.isfeatured ?? false,
      featured_plan_id: updates.featured_plan_id ?? null,
      featured_plan_name: updates.featured_plan_name ?? null
    };

    const { data, error } = await this.supabase
      .from('post')
      .update(payload)
      .eq('postid', postId)
      .select('postid')
      .single();

    if (error) {
      console.error('Update Post After Media Upload Error:', error);
      throw error;
    }

    return data;
  }

  async deletePostById(postId: number) {
    const { error } = await this.supabase
      .from('post')
      .delete()
      .eq('postid', postId);

    if (error) {
      console.error('Delete Post By Id Error:', error);
      throw error;
    }

    return true;
  }

  async addPost(post: Post) {
    const safeImageUrls = Array.isArray(post.image_urls)
      ? post.image_urls.filter(Boolean).slice(0, 10)
      : [];

    const safeVideoUrls = Array.isArray(post.video_urls)
      ? post.video_urls.filter(Boolean).slice(0, 5)
      : [];

    const safeCatalog = Array.isArray(post.catalog)
      ? post.catalog
          .filter(item => item && (item.title || item.price !== null && item.price !== undefined || item.imageUrl))
          .map(item => ({
            title: item.title ?? '',
            price: item.price ?? 0,
            imageUrl: item.imageUrl ?? ''
          }))
          .slice(0, 20)
      : [];

    const payload = {
      userid: String(post.userid ?? ''),
      categoryid: post.categoryid ?? null,
      subcategoryid: post.subcategoryid ?? null,
      title: (post.title ?? '').trim(),
      description: (post.description ?? '').trim(),
      price: post.price ?? 0,
      currencycode: post.currencycode ?? 'INR',
      adtype: post.adtype ?? 'product',
      conditiontype: post.conditiontype ?? '',
      status: post.status ?? 'Active',
      isfeatured: post.isfeatured ?? false,
      featured_plan_id: post.featured_plan_id ?? null,
      isactive: post.isactive ?? true,
      cityid: post.cityid ?? null,
      areaid: post.areaid ?? null,
      contactname: post.contactname ?? '',
      contactphone: post.contactphone ?? '',
      contactemail: post.contactemail ?? '',
      whatsappnumber: post.whatsappnumber ?? '',
      image_url: post.image_url ?? '',
      image_urls: safeImageUrls,
      video_url: post.video_url ?? '',
      video_urls: safeVideoUrls,
      custom_fields: post.custom_fields ?? {},
      category: post.category ?? '',
      subcategory: post.subcategory ?? '',
      location: post.location ?? '',
      address: post.address ?? '',
      catalog: safeCatalog
    };

    console.log('Add Post Payload Size:', JSON.stringify(payload).length);
    console.time('SUPABASE_POST_INSERT');

    const { data, error } = await this.supabase
      .from('post')
      .insert([payload])
      .select('postid')
      .single();

    console.timeEnd('SUPABASE_POST_INSERT');

    if (error) {
      console.error('Add Post Error:', error);
      throw error;
    }

    return data;
  }

  async getPosts(page: number = 0, pageSize: number = 12) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await this.supabase
      .from('post')
      .select('*')
      .range(from, to)
      .order('createdon', { ascending: false });

    if (error) {
      console.error('Get Posts Error:', error);
      throw error;
    }

    return data || [];
  }

  async getPostById(postId: string | number) {
    const { data, error } = await this.supabase
      .from('post')
      .select('*')
      .eq('postid', postId)
      .maybeSingle();

    if (error) {
      console.error('Get Post By Id Error:', error);
      throw error;
    }

    return data;
  }

  async getProductPosts(page: number = 0, pageSize: number = 12) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await this.supabase
      .from('post')
      .select('*')
      .eq('conditiontype', 'product')
      .range(from, to)
      .order('createdon', { ascending: false });

    if (error) {
      console.error('Get Product Posts Error:', error);
      throw error;
    }

    return data || [];
  }

  async getServicePosts(page: number = 0, pageSize: number = 12) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await this.supabase
      .from('post')
      .select('*')
      .eq('conditiontype', 'service')
      .range(from, to)
      .order('createdon', { ascending: false });

    if (error) {
      console.error('Get Service Posts Error:', error);
      throw error;
    }

    return data || [];
  }

  async getFeaturedPosts(from = 0, limit = 8) {
    const to = from + limit - 1;

    const { data, error } = await this.supabase
      .from('post')
      .select('*')
      .eq('isfeatured', true)
      .eq('isactive', true)
      .order('createdon', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('getFeaturedPosts error:', error);
      return [];
    }

    return data || [];
  }

  async getPostsByUserId(userid: string, page: number = 0, pageSize: number = 20) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await this.supabase
      .from('post')
      .select(`
        postid,
        userid,
        title,
        price,
        createdon,
        image_url,
        isactive,
        status,
        adtype
      `)
      .eq('userid', userid)
      .order('createdon', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Get My Posts Error:', error);
      throw error;
    }

    return data || [];
  }

  async deletePost(postId: string) {
    const { error } = await this.supabase
      .from('post')
      .delete()
      .eq('postid', postId);

    if (error) {
      console.error('Error deleting post:', error);
      throw error;
    }

    return true;
  }

  // ---------------- Users / Login ----------------
  async getNewsFeed(type: string = 'all', limit: number = 20) {
    let query = this.supabase
      .from('news_feed')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type !== 'all') {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get News Feed Error:', error);
      return [];
    }

    const now = new Date();

    return (data || []).filter((item: any) => {
      const startOk = !item.start_at || new Date(item.start_at) <= now;
      const endOk = !item.end_at || new Date(item.end_at) >= now;
      return startOk && endOk;
    });
  }

  async getUserById(userid: number) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('userid', userid)
      .maybeSingle();

    return { data, error };
  }

  async getUserByEmail(email: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    return { data, error };
  }

  async getUserByPhone(phone: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('phonenumber', phone)
      .maybeSingle();

    return { data, error };
  }

  async getUserByFullname(fullname: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('fullname', fullname)
      .maybeSingle();

    return { data, error };
  }

  async updateUserOtpByEmail(email: string, otp: string, expiry: number) {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        otp,
        otp_expired: expiry
      })
      .eq('email', email);

    return { data, error };
  }

  async updateUserPasswordByEmail(email: string, password: string) {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        password
      })
      .eq('email', email);

    return { data, error };
  }

  async updateUserProfile(user: {
    userid: number;
    fullname: string;
    email: string;
    phonenumber: string;
    profileimage: string | null;
    isverified: boolean;
    isactive: boolean;
  }) {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        fullname: user.fullname,
        email: user.email,
        phonenumber: user.phonenumber,
        profileimage: user.profileimage,
        isverified: user.isverified,
        isactive: user.isactive,
        updatedon: new Date().toISOString()
      })
      .eq('userid', user.userid)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }

    return data;
  }

  // ---------------- User Types ----------------
  async getUserTypes() {
    const { data, error } = await this.supabase
      .from('user_types')
      .select('*')
      .eq('isactive', true);

    return { data, error };
  }

  // ---------------- OAuth ----------------
async signInWithOAuth(provider: 'google' | 'github') {
  const redirectTo =
    window.location.hostname === 'localhost'
      ? 'http://localhost:4200/login'
      : 'https://amihub.in/login';

  return this.supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo
    }
  });
}

  async signOut() {
    await this.supabase.auth.signOut();
    this.currentUser = null;

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userTypeId');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('googleLoginPending');
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  }

  async syncGoogleUserToPublicUsers() {
    if (!this.isBrowser()) {
      return {
        data: null,
        error: new Error('Not running in browser')
      };
    }

    const { data: authData, error: authError } = await this.supabase.auth.getUser();

    if (authError || !authData.user) {
      return {
        data: null,
        error: authError || new Error('No authenticated Google user found')
      };
    }

    const authUser = authData.user;

    const email = authUser.email || '';
    const fullName =
      authUser.user_metadata?.['full_name'] ||
      authUser.user_metadata?.['name'] ||
      '';
    const phone = authUser.user_metadata?.['phone'] || '';

    const { data: existingUser, error: fetchError } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (existingUser) {
      const { data: updatedUser, error: updateError } = await this.supabase
        .from('users')
        .update({
          fullname: existingUser.fullname || fullName,
          phonenumber: existingUser.phonenumber || phone,
          isactive: true,
          updatedon: new Date().toISOString()
        })
        .eq('userid', existingUser.userid)
        .select()
        .single();

      return { data: updatedUser, error: updateError };
    }

    const { data: newUser, error: insertError } = await this.supabase
      .from('users')
      .insert([
        {
          fullname: fullName || 'Google User',
          email,
          phonenumber: phone,
          usertypeid: 1,
          isverified: true,
          isactive: true,
          createdon: new Date().toISOString(),
          updatedon: new Date().toISOString()
        }
      ])
      .select()
      .single();

    return { data: newUser, error: insertError };
  }

  async getAllBrowseCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .in('category_type', ['product', 'service', 'both'])
      .order('categoryname', { ascending: true });

    if (error) {
      console.error('Error loading browse categories:', error);
      return [];
    }

    return data || [];
  }

  async getProductCategoriesOnly(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .in('category_type', ['product', 'both'])
      .order('categoryname', { ascending: true });

    if (error) {
      console.error('Error loading product categories:', error);
      return [];
    }

    return data || [];
  }

  async getServiceCategoriesOnly(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .in('category_type', ['service', 'both'])
      .order('categoryname', { ascending: true });

    if (error) {
      console.error('Error loading service categories:', error);
      return [];
    }

    return data || [];
  }

  async updateUserOnboarding(payload: {
    userid: number;
    usertypeid: number;
    listingtype?: string | null;
    isonboardingcompleted: boolean;
    password?: string;
  }) {
    const updatePayload: any = {
      usertypeid: payload.usertypeid,
      listingtype: payload.listingtype ?? null,
      isonboardingcompleted: payload.isonboardingcompleted,
      updatedon: new Date().toISOString()
    };

    if (payload.password) {
      updatePayload.password = payload.password;
    }

    const { data, error } = await this.supabase
      .from('users')
      .update(updatePayload)
      .eq('userid', payload.userid)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}