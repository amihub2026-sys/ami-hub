

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { supabase } from '../../../supabaseClient';

interface CartItem {
  cart_id: number;
  product_id: string | null;
  name: string;
  price: number;
  qty: number;
  image: string;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class Cart implements OnInit {
  cartItems: CartItem[] = [];
  loading = false;
  errorMessage = '';

  async ngOnInit(): Promise<void> {
    await this.loadCartItems();
  }

  async loadCartItems(): Promise<void> {
  this.loading = true;
  this.errorMessage = '';

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const user = sessionData?.session?.user;

    if (!user) {
      this.cartItems = [];
      this.errorMessage = 'Please login to view your cart.';
      return;
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select('cart_id, product_id, name, price, qty, image')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    this.cartItems = (data || []).map((item: any) => ({
      cart_id: item.cart_id,
      product_id: item.product_id ?? null,
      name: item.name ?? '',
      price: Number(item.price ?? 0),
      qty: Number(item.qty ?? 1),
      image: item.image ?? 'assets/no-image.png'
    }));
  } catch (error: any) {
    console.error('Error loading cart:', error);
    this.errorMessage = error?.message || 'Failed to load cart.';
    this.cartItems = [];
  } finally {
    this.loading = false;
  }
}

  async increaseQty(item: CartItem): Promise<void> {
    const newQty = item.qty + 1;

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ qty: newQty })
        .eq('cart_id', item.cart_id);

      if (error) throw error;

      item.qty = newQty;
    } catch (error) {
      console.error('Error increasing quantity:', error);
    }
  }

  async decreaseQty(item: CartItem): Promise<void> {
    if (item.qty <= 1) {
      await this.removeItem(item);
      return;
    }

    const newQty = item.qty - 1;

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ qty: newQty })
        .eq('cart_id', item.cart_id);

      if (error) throw error;

      item.qty = newQty;
    } catch (error) {
      console.error('Error decreasing quantity:', error);
    }
  }

  async removeItem(item: CartItem): Promise<void> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', item.cart_id);

      if (error) throw error;

      this.cartItems = this.cartItems.filter(cart => cart.cart_id !== item.cart_id);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }

  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  get delivery(): number {
    return this.cartItems.length > 0 ? 499 : 0;
  }

  get total(): number {
    return this.subtotal + this.delivery;
  }
}