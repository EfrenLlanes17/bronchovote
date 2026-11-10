import { Routes } from '@angular/router';
import { Admin } from './components/admin/admin';
import { Billstats } from './components/billstats/billstats';
import { Vote } from './components/vote/vote';

export const routes: Routes = [
	{ path: '', redirectTo: 'login', pathMatch: 'full' },
	{ path: 'vote', component: Vote },
	{ path: 'admin', component: Admin },
	{ path: 'admin/bill/:billId', component: Billstats },
];
