import { Injectable } from '@angular/core';

export interface ServiceBlockDraft {
  title: string;
  price: number | null;
  image: File | null;
}

export interface RawPostDraft {
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
  featured_plan_name?: string | null;
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
  country?: string | null;
  state?: string | null;
  district?: string | null;
  area?: string | null;
  catalog?: any[];
  custom_fields?: any;
}

interface DraftStorageModel {
  rawPost: RawPostDraft | null;
  flowType: 'normal' | 'featured';
  postId: number | null;
  userId: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PostDraftService {
  private readonly storageKey = 'post_draft_state';

  private rawPost: RawPostDraft | null = null;
  private mainPhoto: File | null = null;
  private otherImages: File[] = [];
  private videos: File[] = [];
  private serviceBlocks: ServiceBlockDraft[] = [];
  private flowType: 'normal' | 'featured' = 'normal';
  private postId: number | null = null;
  private userId: string | null = null;

  constructor() {
    this.restoreDraftMeta();
  }

  setDraft(data: {
    rawPost: RawPostDraft;
    mainPhoto: File | null;
    otherImages: File[];
    videos: File[];
    serviceBlocks: ServiceBlockDraft[];
    flowType: 'normal' | 'featured';
    postId?: number | null;
    userId?: string | null;
  }): void {
    this.rawPost = this.cloneRawPost(data.rawPost);
    this.mainPhoto = data.mainPhoto ?? null;
    this.otherImages = [...(data.otherImages ?? [])];
    this.videos = [...(data.videos ?? [])];
    this.serviceBlocks = (data.serviceBlocks ?? []).map(block => ({
      title: block.title ?? '',
      price: block.price ?? null,
      image: block.image ?? null
    }));
    this.flowType = data.flowType ?? 'normal';
    this.postId = data.postId ?? null;
    this.userId = data.userId ?? null;

    this.persistDraftMeta();
  }

  updatePostId(postId: number | null): void {
    this.postId = postId;
    this.persistDraftMeta();
  }

  updateUserId(userId: string | null): void {
    this.userId = userId;
    this.persistDraftMeta();
  }

  updateFlowType(flowType: 'normal' | 'featured'): void {
    this.flowType = flowType;
    this.persistDraftMeta();
  }

  getRawPost(): RawPostDraft | null {
    return this.rawPost ? this.cloneRawPost(this.rawPost) : null;
  }

  getMainPhoto(): File | null {
    return this.mainPhoto;
  }

  getOtherImages(): File[] {
    return [...this.otherImages];
  }

  getVideos(): File[] {
    return [...this.videos];
  }

  getServiceBlocks(): ServiceBlockDraft[] {
    return this.serviceBlocks.map(block => ({
      title: block.title,
      price: block.price,
      image: block.image
    }));
  }

  getFlowType(): 'normal' | 'featured' {
    return this.flowType;
  }

  getPostId(): number | null {
    return this.postId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  hasDraft(): boolean {
    return !!this.rawPost;
  }

  clearDraft(): void {
    this.rawPost = null;
    this.mainPhoto = null;
    this.otherImages = [];
    this.videos = [];
    this.serviceBlocks = [];
    this.flowType = 'normal';
    this.postId = null;
    this.userId = null;

    this.clearDraftMeta();
  }

  private cloneRawPost(post: RawPostDraft): RawPostDraft {
    return {
      ...post,
      image_urls: Array.isArray(post.image_urls) ? [...post.image_urls] : [],
      video_urls: Array.isArray(post.video_urls) ? [...post.video_urls] : [],
      catalog: Array.isArray(post.catalog)
        ? post.catalog.map(item => ({ ...item }))
        : [],
      custom_fields: post.custom_fields
        ? JSON.parse(JSON.stringify(post.custom_fields))
        : {}
    };
  }

  private persistDraftMeta(): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return;
    }

    const payload: DraftStorageModel = {
      rawPost: this.rawPost ? this.cloneRawPost(this.rawPost) : null,
      flowType: this.flowType,
      postId: this.postId,
      userId: this.userId
    };

    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to persist draft meta:', error);
    }
  }

  private restoreDraftMeta(): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      const saved = sessionStorage.getItem(this.storageKey);
      if (!saved) return;

      const parsed: DraftStorageModel = JSON.parse(saved);

      this.rawPost = parsed.rawPost ? this.cloneRawPost(parsed.rawPost) : null;
      this.flowType = parsed.flowType ?? 'normal';
      this.postId = parsed.postId ?? null;
      this.userId = parsed.userId ?? null;
    } catch (error) {
      console.error('Failed to restore draft meta:', error);
      this.clearDraftMeta();
    }
  }

  private clearDraftMeta(): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      sessionStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear draft meta:', error);
    }
  }
}