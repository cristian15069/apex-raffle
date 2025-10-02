import { Component, inject } from '@angular/core';
import { ProductService } from '../../services/product';
import { Observable } from 'rxjs';
import { Product } from '../../models/product.model';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-product-gallery',
  standalone: true,
  imports: [CommonModule, RouterLink , RouterModule],
  templateUrl: './product-gallery.html',
})
export class ProductGalleryComponent {
  productService = inject(ProductService);
  products$: Observable<Product[]> = this.productService.getProducts();

  // Función para calcular el progreso de la barra
  calculateProgress(ticketsSold: number, totalTickets: number): number {
    if (totalTickets === 0) return 0;
    return (ticketsSold / totalTickets) * 100;
  }
}
