import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { PostAd } from './pages/post-ad/post-ad';
import { ProductList } from './pages/product-list/product-list';
import { ProductDetails } from './pages/product-details/product-details';
import { Categories } from './pages/categories/categories';
import { Service } from './pages/service/service';
import { ServiceList } from './pages/service-list/service-list';
import { Coustme } from './pages/coustme/coustme';
import { CustomFields } from './pages/custom-fields/custom-fields';
import { ServiceCustom } from './pages/service-custom/service-custom';
import { ProductCategories } from './pages/product-categories/product-categories';
import { ServiceCategories } from './pages/service-categories/service-categories';
import { SellerProfileComponent } from './pages/seller-profile/seller-profile';
import { PostViewComponent } from './pages/post-view/post-view';
import { SubscriptionPlan } from './pages/subscription-plan/subscription-plan';
import { FeaturedPlan } from './pages/featured-plan/featured-plan';
import { AdminPage } from './pages/admin-page/admin-page';
import { AccountSetup } from './pages/account-setup/account-setup';
import { MyPosts } from './pages/my-posts/my-posts';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';
import { Terms } from './pages/terms/terms';
import { PrivacyPolicy } from './pages/privacy-policy/privacy-policy';
import { RefundPolicy } from './pages/refund-policy/refund-policy';
import { Help } from './pages/help/help';
import { Notification } from './pages/notification/notification';
import { Chats } from './pages/chats/chats';
import { Cart } from './pages/cart/cart';
import { Favt } from './pages/favt/favt';
import { Payment } from './pages/payment/payment';

function adminGuard() {
  return () => {
    const token = localStorage.getItem('adminToken');
    return token === 'loggedAdmin';
  };
}

export const routes: Routes = [
  { path: '', component: Home },

  { path: 'account-setup', component: AccountSetup },
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  { path: 'my-posts', component: MyPosts },
  { path: 'edit-post/:id', component: Service },

  { path: 'products', component: ProductList },
  { path: 'product-categories', component: ProductCategories },

  { path: 'post-ad', component: PostAd },
  { path: 'details/:id', component: PostViewComponent },
  { path: 'post-view/:id', component: PostViewComponent },
  { path: 'post-view', component: PostViewComponent },

  { path: 'all-categories', component: Categories },

  {
    path: 'all-listings',
    loadComponent: () =>
      import('./pages/search-results/search-results').then(m => m.SearchResults)
  },

  { path: 'service', component: Service },
  { path: 'service-list', component: ServiceList },
  { path: 'service-categories', component: ServiceCategories },

  { path: 'coustme', component: Coustme },
  { path: 'custom-fields', component: CustomFields },
  { path: 'service-custom', component: ServiceCustom },

  { path: 'seller-profile', component: SellerProfileComponent },

  {
    path: 'search',
    loadComponent: () =>
      import('./pages/search-results/search-results').then(m => m.SearchResults)
  },

  { path: 'subscription-plan', component: SubscriptionPlan },
  { path: 'featured-plan', component: FeaturedPlan },

  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: 'terms', component: Terms },
  { path: 'privacy-policy', component: PrivacyPolicy },
  { path: 'refund-policy', component: RefundPolicy },
  { path: 'help', component: Help },
  { path: 'payment', component: Payment },
  { path: 'notification', component: Notification },
  { path: 'cart', component: Cart },
  { path: 'favt', component: Favt },
  { path: 'chats', component: Chats },

  {
    path: 'news',
    loadComponent: () =>
      import('./pages/news/news').then(m => m.News)
  },

  {
    path: 'admin-page',
    component: AdminPage,
    canActivate: [adminGuard]
  },

  { path: '**', redirectTo: '' }
];