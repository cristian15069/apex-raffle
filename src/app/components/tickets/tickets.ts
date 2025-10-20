import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PurchaseService, Purchase } from '../../services/purchase';
import { ProductService } from '../../services/product';
import { Product } from '../../models/product.model';
import { Observable, forkJoin, map, switchMap, of, catchError, tap, take } from 'rxjs';

interface PurchaseWithProduct extends Purchase {
  productDetails?: Product | undefined;
}

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tickets.html',
})
export class TicketsComponent implements OnInit {
  private purchaseService = inject(PurchaseService);
  private productService = inject(ProductService);

  purchasesWithDetails$!: Observable<PurchaseWithProduct[]>;
  isLoading = true;

  ngOnInit(): void {
    console.log('TicketsComponent: ngOnInit started.');
    this.isLoading = true;

    this.purchasesWithDetails$ = this.purchaseService.getUserPurchases().pipe(
      tap(purchases => console.log('TicketsComponent: Purchases received:', purchases)),
      switchMap((purchases: Purchase[]) => {
        if (!purchases || purchases.length === 0) {
          console.log('TicketsComponent: No purchases found.');
          this.isLoading = false;
          return of([]);
        }

        console.log('TicketsComponent: Found purchases, fetching product details...');
        const productObservables: Observable<Product | undefined>[] = purchases.map(purchase =>
          this.productService.getProductById(purchase.productId).pipe(
            take(1),
            tap(product => console.log(`TicketsComponent: Detail received for product ${purchase.productId}:`, product)),
            catchError(err => {
              console.error(`TicketsComponent: Error fetching product ${purchase.productId}:`, err);
              return of(undefined);
            })
          )
        );

        console.log('TicketsComponent: Calling forkJoin...');
        return forkJoin(productObservables).pipe(
          tap(products => console.log('TicketsComponent: forkJoin completed! Product details received:', products)),
          map((products: (Product | undefined)[]) => {
            console.log('TicketsComponent: Mapping combined data...');
            const combined: PurchaseWithProduct[] = purchases.map((purchase, index) => ({
              ...purchase,
              productDetails: products[index]
            }));
            console.log('TicketsComponent: Combined data ready:', combined);
            this.isLoading = false;
            return combined;
          }),
          catchError(err => {
            console.error('TicketsComponent: Error in forkJoin or map:', err);
            this.isLoading = false;
            return of([]);
          })
        );
      }),
      catchError(err => {
        console.error('TicketsComponent: Error fetching purchases:', err);
        this.isLoading = false;
        return of([]);
      })
    );
  }
}