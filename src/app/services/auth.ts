// src/app/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { Auth, User, authState, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { doc, docData, Firestore, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

export interface UserProfile {
  uid: string;
  email: string;
  role?: 'user' | 'admin';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private router: Router = inject(Router);

  // ✅ CORRECCIÓN: Cambiamos 'private' a 'public' para que el AdminGuard pueda usarlo.
  // 'readonly' es una buena práctica para que no se pueda modificar desde fuera.
  public readonly userProfile$ = authState(this.auth).pipe(
    switchMap(user => {
      if (user) {
        const userDocRef = doc(this.firestore, `users/${user.uid}`);
        return (docData(userDocRef) as Observable<UserProfile | undefined>).pipe(
          map(profile => ({
            uid: user.uid,
            email: user.email!,
            role: profile?.role || 'user'
          })),
          catchError(error => {
            console.warn("No se pudo obtener el perfil de Firestore. Usando perfil básico por defecto.", error);
            return of({ uid: user.uid, email: user.email!, role: 'user' });
          })
        );
      } else {
        return of(null);
      }
    })
  );

  // Convertimos el observable público en una señal para el resto de la app
  currentUserSig = toSignal(this.userProfile$);

  async register(email: string, password: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = userCredential.user;
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      role: 'user'
    });
    return user;
  }

  login(email: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}