import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, serverTimestamp, query, where, collectionData } from '@angular/fire/firestore'; 
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators'; 
import { AuthService } from './auth';

export interface Purchase {
  id: string;
  productId: string;
  ticketsBought: number;
  userId: string;
  paymentStatus: 'pending' | 'completed';
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private firestore: Firestore = inject(Firestore);
  private functions: Functions = inject(Functions);
  
  private authService: AuthService = inject(AuthService);

  async createPurchase(productId: string, ticketsBought: number): Promise<string> {
    const user = this.authService.currentUserSig(); 
    if (!user) {
      throw new Error('Usuario no autenticado. Por favor, inicia sesión.');
    }

    const purchasesCollection = collection(this.firestore, 'purchases');
    const purchaseData = {
      productId,
      ticketsBought,
      userId: user.uid,
      paymentStatus: 'pending',
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(purchasesCollection, purchaseData);
    return docRef.id;
  }

  /**
   * Devuelve las compras del usuario actual de forma reactiva.
   */
  getUserPurchases(): Observable<Purchase[]> {
    // ✅ CORRECCIÓN: Usamos el observable 'userProfile$' de nuestro AuthService.
    //    Es más eficiente y consistente.
    return this.authService.userProfile$.pipe(
      switchMap(user => {
        if (user) {
          // Si hay un usuario, hacemos la consulta a Firestore.
          const purchasesCollection = collection(this.firestore, 'purchases');
          const q = query(purchasesCollection, where('userId', '==', user.uid));
          return collectionData(q, { idField: 'id' }) as Observable<Purchase[]>;
        } else {
          // Si no hay usuario, devolvemos un arreglo vacío.
          return of([]);
        }
      })
    );
  }

  getCheckoutUrl(purchaseId: string): Observable<{ url: string }> {
    const createCheckoutFn = httpsCallable<{ purchaseId: string }, { url: string }>(this.functions, 'createCheckoutSession');
    return from(createCheckoutFn({ purchaseId })).pipe(
      map(result => result.data)
    );
  }
}