import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'document/:id',
    loadComponent: () => import('./components/detail/detail').then(m => m.Detail)
  },
  {
    path: 'analytics',
    loadComponent: () => import('./components/analytics/analytics').then(m => m.Analytics)
  },
  {
    path: 'monitor',
    loadComponent: () => import('./components/monitor/monitor').then(m => m.Monitor)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
