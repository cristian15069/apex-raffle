// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { RegisterComponent } from './components/register/register';
import { ProductGalleryComponent } from './components/product-gallery/product-gallery';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard';
import { NotFoundComponent } from './components/not-found/not-found';
import { ProductDetailComponent } from './components/product-detail/product-detail';
import { AuthGuard } from '@angular/fire/auth-guard';
import { TicketsComponent } from './components/tickets/tickets';
import { SalesChartComponent } from './components/sales-chart/sales-chart';

export const routes: Routes = [
  { path: '', redirectTo: '/gallery', pathMatch: 'full' }, 
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'gallery', component: ProductGalleryComponent },
  { path: 'admin', component: AdminDashboardComponent ,canActivate: [AuthGuard]}, 
  { path: 'grafic', component: SalesChartComponent ,canActivate: [AuthGuard]}, 
  { path: 'tickets', component: TicketsComponent, canActivate: [AuthGuard]},
  { path: 'product/:id', component: ProductDetailComponent },
  
  // ✅ MOVIDA AL FINAL: Esta ruta ahora solo se activará si ninguna de las anteriores coincide.
  { path: '**', component: NotFoundComponent } 
];