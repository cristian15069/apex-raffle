import { Component, inject } from '@angular/core';
import { PurchaseService, Purchase } from '../../services/purchase';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tickets.html',
})
export class TicketsComponent {
  purchaseService = inject(PurchaseService);
  purchases$: Observable<Purchase[]> = this.purchaseService.getUserPurchases();
}