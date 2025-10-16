import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private firestore: Firestore = inject(Firestore);
  private functions: Functions = inject(Functions);

  getProducts(): Observable<Product[]> {
    const productsCollection = collection(this.firestore, 'products');
    return collectionData(productsCollection, { idField: 'id' }) as Observable<Product[]>;
  }
  
  getProductById(id: string): Observable<Product> {
    const productDocRef = doc(this.firestore, `products/${id}`);
    return docData(productDocRef, { idField: 'id' }) as Observable<Product>;
  }

  // ✅ 2. AÑADIDO: Método que faltaba para obtener los productos de un admin específico.
  /**
   * Obtiene todas las rifas creadas por un administrador específico.
   * @param adminId - El UID del administrador.
   * @returns Un observable con un arreglo de productos.
   */
  getProductsByAdmin(adminId: string): Observable<Product[]> {
    const productsCollection = collection(this.firestore, 'products');
    // Crea una consulta para filtrar los productos donde 'adminId' coincida
    const q = query(productsCollection, where('adminId', '==', adminId));
    // Devuelve los datos de la colección filtrada
    return collectionData(q, { idField: 'id' }) as Observable<Product[]>;
  }

  /**
   * Llama a la Cloud Function 'createRaffleProduct' para crear un nuevo producto.
   */
  async createProduct(productData: { name: string; description: string; imageUrl: string; baseCost: number }): Promise<{ success: boolean; message: string }> {
    const createRaffleFn = httpsCallable<
      { name: string; description: string; imageUrl: string; baseCost: number }, 
      { success: boolean; message: string }
    >(this.functions, 'createRaffleProduct');
    
    const result = await createRaffleFn(productData);
    return result.data;
  }
  
  /**
   * ✅ 3. MEJORADO: Se añadieron tipos explícitos para mayor seguridad.
   * Llama a la Cloud Function para desactivar una rifa.
   */
  deactivateProduct(productId: string): Promise<{ success: boolean; message: string }> {
    const deactivateFn = httpsCallable<
      { productId: string }, 
      { success: boolean; message: string }
    >(this.functions, 'deactivateRaffleProduct');

    // Se devuelve solo la data de la respuesta para simplificar el manejo en el componente
    return deactivateFn({ productId }).then(result => result.data);
  }
}