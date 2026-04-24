import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { supabase } from '../../../supabaseClient';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chats.html',
  styleUrls: ['./chats.css']
})
export class Chats implements OnInit, OnDestroy {
  currentUser: any = null;

  messages = signal<any[]>([]);
  conversations = signal<any[]>([]);
  selectedChat = signal<any | null>(null);

  newMessage = '';
  isLoading = signal(false);

  postId: string | null = null;
  sellerId: string | null = null;

  private channel: any = null;

  constructor(
    private route: ActivatedRoute,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit() {
    const userUuid = await this.supabaseService.resolveEffectiveUserUuid();

    if (!userUuid) return;

    this.currentUser = {
      id: userUuid
    };

    this.postId = this.route.snapshot.queryParamMap.get('postId');
    this.sellerId = this.route.snapshot.queryParamMap.get('sellerId');

    await this.loadConversations();

    if (this.postId && this.sellerId) {
      const existing = this.conversations().find(
        c => String(c.post_id) === String(this.postId) && String(c.otherUserId) === String(this.sellerId)
      );

      if (existing) {
        await this.openChat(existing);
      } else {
        const tempChat = {
          post_id: this.postId,
          otherUserId: this.sellerId,
          otherUserName: 'Seller',
          lastMessage: '',
          created_at: new Date().toISOString()
        };
        this.selectedChat.set(tempChat);
        this.messages.set([]);
      }
    } else if (this.conversations().length > 0) {
      await this.openChat(this.conversations()[0]);
    }

    this.listenMessages();
  }

  async loadConversations() {
    this.isLoading.set(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${this.currentUser.id},receiver_id.eq.${this.currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];
      const grouped = new Map<string, any>();

      for (const row of rows) {
        const otherUserId =
          String(row.sender_id) === String(this.currentUser.id)
            ? row.receiver_id
            : row.sender_id;

        const key = `${row.post_id}_${otherUserId}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            post_id: row.post_id,
            otherUserId,
            otherUserName: 'User',
            lastMessage: row.message,
            created_at: row.created_at,
            unreadCount:
              String(row.receiver_id) === String(this.currentUser.id) && !row.is_read ? 1 : 0
          });
        } else {
          const existing = grouped.get(key);
          if (String(row.receiver_id) === String(this.currentUser.id) && !row.is_read) {
            existing.unreadCount += 1;
          }
        }
      }

      this.conversations.set(Array.from(grouped.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
      this.conversations.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async openChat(chat: any) {
    this.selectedChat.set(chat);
    await this.loadMessages(chat);
    await this.markConversationAsRead(chat);
  }

  async loadMessages(chat: any) {
    if (!chat || !this.currentUser) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('post_id', chat.post_id)
        .or(
          `and(sender_id.eq.${this.currentUser.id},receiver_id.eq.${chat.otherUserId}),and(sender_id.eq.${chat.otherUserId},receiver_id.eq.${this.currentUser.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      this.messages.set(data || []);

      setTimeout(() => {
        const el = document.querySelector('.messages');
        el?.scrollTo({ top: (el as HTMLElement).scrollHeight, behavior: 'smooth' });
      }, 50);
    } catch (error) {
      console.error('Error loading messages:', error);
      this.messages.set([]);
    }
  }

  async sendMessage() {
    const text = this.newMessage.trim();
    const chat = this.selectedChat();

    if (!text || !chat || !this.currentUser) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: this.currentUser.id,
          receiver_id: chat.otherUserId,
          post_id: chat.post_id,
          message: text,
          is_read: false,
          private: true
        });

      if (error) throw error;

      this.newMessage = '';
      await this.loadConversations();
      await this.loadMessages(chat);
    } catch (error) {
      console.error('Send message error:', error);
    }
  }

  async markConversationAsRead(chat: any) {
    if (!chat || !this.currentUser) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('post_id', chat.post_id)
        .eq('sender_id', chat.otherUserId)
        .eq('receiver_id', this.currentUser.id)
        .eq('is_read', false);

      this.conversations.update(list =>
        list.map(item =>
          item.post_id === chat.post_id && String(item.otherUserId) === String(chat.otherUserId)
            ? { ...item, unreadCount: 0 }
            : item
        )
      );
    } catch (error) {
      console.error('Mark read error:', error);
    }
  }

  listenMessages() {
    this.channel = supabase
      .channel('chat-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        async () => {
          await this.loadConversations();

          const selected = this.selectedChat();
          if (selected) {
            await this.loadMessages(selected);
          }
        }
      )
      .subscribe();
  }

  getTime(value: string) {
    if (!value) return '';
    return new Date(value).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  isSelected(chat: any): boolean {
    const selected = this.selectedChat();
    return !!selected &&
      String(selected.post_id) === String(chat.post_id) &&
      String(selected.otherUserId) === String(chat.otherUserId);
  }

  ngOnDestroy() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }
  }
}