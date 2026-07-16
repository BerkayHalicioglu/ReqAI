import { Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { Detail } from './components/detail/detail';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'document/:id', component: Detail },
  { path: '**', redirectTo: '' }
];
