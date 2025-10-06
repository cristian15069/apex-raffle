import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProductService } from '../../services/product';
import { PurchaseService } from '../../services/purchase';
import { Product } from '../../models/product.model';
import { Observable, of, switchMap, catchError, combineLatest, map, firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth'; 

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-detail.html',
})
export class ProductDetailComponent implements OnInit {
  product$: Observable<Product | undefined> | undefined;
  isOwner$!: Observable<boolean>;
  
  ticketQuantity = 1;
  isLoading = false;
  errorMessage = '';

  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private purchaseService = inject(PurchaseService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.product$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) {
          return of(undefined);
        }
        return this.productService.getProductById(id);
      }),
      catchError(error => {
        console.error('Error al obtener el producto:', error);
        this.errorMessage = 'No se pudo encontrar el producto solicitado.';
        return of(undefined);
      })
    );

    this.isOwner$ = combineLatest([
      this.product$,
      this.authService.userProfile$ 
    ]).pipe(
      map(([product, user]) => {
        if (!product || !user) {
          return false; 
        }
        return product.adminId === user.uid; 
      })
    );
  }

  async handlePurchase(product: Product): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const purchaseId = await this.purchaseService.createPurchase(product.id, this.ticketQuantity);
      const response = await firstValueFrom(this.purchaseService.getCheckoutUrl(purchaseId));

      if (response && response.url) {
        window.location.href = response.url;
      } else {
        throw new Error("No se recibió una URL de pago válida.");
      }
    } catch (error: any) {
      this.errorMessage = error.message || "Ocurrió un error inesperado durante la compra.";
      console.error("Error en handlePurchase:", error);
    } finally {
      this.isLoading = false;
    }
  }

  // MÉTODOS AUXILIARES (sin cambios)
  calculateProgress(ticketsSold: number, totalTickets: number): number {
    if (totalTickets === 0) return 0;
    return (ticketsSold / totalTickets) * 100;
  }

  increaseQuantity(max: number): void {
    if (this.ticketQuantity < max) {
      this.ticketQuantity++;
    }
  }
  
  decreaseQuantity(): void {
    if (this.ticketQuantity > 1) {
      this.ticketQuantity--;
    }
  }
}