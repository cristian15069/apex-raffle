import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData } from '@angular/fire/firestore';
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

  /**
   * Llama a la Cloud Function 'createRaffleProduct' para crear un nuevo producto.
   * @param productData - Los datos del producto a crear.
   * @returns Una promesa que se resuelve con { success, message }.
   */
  async createProduct(productData: { name: string; description: string; imageUrl?: string; baseCost: number }): Promise<{ success: boolean; message: string }> {
    const createRaffleFn = httpsCallable<
      { name: string; description: string; imageUrl?: string; baseCost: number },
      { success: boolean; message: string }
    >(this.functions, 'createRaffleProduct');

    const result = await createRaffleFn(productData);
    return result.data; // ⬅️ aquí regresas solo lo que importa
  }

  getProductById(id: string): Observable<Product> {
    const productDocRef = doc(this.firestore, `products/${id}`);
    return docData(productDocRef, { idField: 'id' }) as Observable<Product>;
  }
}
