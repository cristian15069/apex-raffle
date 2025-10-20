import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, serverTimestamp, query, where, collectionData, Timestamp, CollectionReference } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth';

export interface Purchase {
  id: string;
  productId: string;
  ticketsBought: number;
  userId: string;
  paymentStatus: 'pending' | 'completed';
  createdAt: Timestamp; 
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

    const purchasesCollection = collection(this.firestore, 'purchases') as CollectionReference<Omit<Purchase, 'id'>>; 
    const purchaseData = {
      productId,
      ticketsBought,
      userId: user.uid,
      paymentStatus: 'pending',
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(purchasesCollection, purchaseData as Omit<Purchase, 'id'>);
    return docRef.id;
  }

  getUserPurchases(): Observable<Purchase[]> {
    return this.authService.userProfile$.pipe(
      switchMap(user => {
        if (user && user.uid) {
          const purchasesCollection = collection(this.firestore, 'purchases') as CollectionReference<Purchase>;
          
          const q = query(purchasesCollection, where('userId', '==', user.uid));
          return collectionData<Purchase>(q, { idField: 'id' }); 
        } else {
          return of([]); 
        }
      }),
      catchError(err => {
          return of([]); 
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