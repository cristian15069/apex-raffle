import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; // Se añade RouterModule
import { ProductService } from '../../services/product';
import { PurchaseService } from '../../services/purchase';
import { Product } from '../../models/product.model';
// ✅ Se importa 'catchError'
import { Observable, of, switchMap, firstValueFrom, catchError } from 'rxjs'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  // ✅ Se añade RouterModule para poder usar [routerLink] en el HTML si es necesario
  imports: [CommonModule, FormsModule, RouterModule], 
  templateUrl: './product-detail.html',
})
export class ProductDetailComponent implements OnInit {
  product$: Observable<Product | undefined> | undefined;
  ticketQuantity = 1;
  isLoading = false;
  errorMessage = '';

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private purchaseService = inject(PurchaseService);

  ngOnInit(): void {
    this.product$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) {
          // Si no hay ID, directamente devolvemos undefined
          return of(undefined);
        }
        return this.productService.getProductById(id);
      }),
      // ✅ MEJORA: Capturamos cualquier error que ocurra al buscar el producto
      catchError(error => {
        console.error('Error al obtener el producto:', error);
        this.errorMessage = 'No se pudo encontrar el producto solicitado.';
        // Devolvemos 'undefined' para que el HTML pueda mostrar un mensaje de error
        return of(undefined); 
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