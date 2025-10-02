import { Injectable, inject } from '@angular/core';
import { getMessaging, getToken, onMessage } from '@angular/fire/messaging';
import { AuthService } from './auth';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private authService: AuthService = inject(AuthService);
  private firestore: Firestore = inject(Firestore);

  /**
   * Pide permiso para notificaciones y guarda el token del dispositivo en el perfil del usuario.
   * SOLO debe llamarse si el usuario es un administrador.
   */
  async requestPermissionAndSaveToken(): Promise<void> {
    try {
      const messaging = getMessaging();
      const user = await firstValueFrom(this.authService.userProfile$);

      // Solo procedemos si hay un usuario y es administrador
      if (!user || user.role !== 'admin') {
        console.log('El usuario no es admin, no se pedirá token de notificación.');
        return;
      }

      // Pide permiso al navegador
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Permiso de notificación concedido.');
        
        // Obtiene el token del dispositivo
        // Reemplaza 'TU_VAPID_KEY' con la clave de tu proyecto de Firebase
        const fcmToken = await getToken(messaging, { vapidKey: 'TU_VAPID_KEY' });

        if (fcmToken) {
          console.log('Token FCM obtenido:', fcmToken);
          // Guarda el token en el documento del usuario en Firestore
          const userDocRef = doc(this.firestore, `users/${user.uid}`);
          await updateDoc(userDocRef, {
            fcmTokens: [fcmToken] // Guardamos el token en un array
          });
        } else {
          console.log('No se pudo obtener el token de registro.');
        }
      } else {
        console.log('No se concedió permiso para notificaciones.');
      }
    } catch (err) {
      console.error('Ocurrió un error al obtener el token.', err);
    }
  }

  /**
   * Escucha los mensajes entrantes mientras la app está abierta.
   */
  listenForMessages() {
    const messaging = getMessaging();
    onMessage(messaging, (payload) => {
      console.log('Mensaje recibido en primer plano. ', payload);
      // Aquí podrías mostrar una notificación personalizada dentro de la app
      alert(`¡Notificación! ${payload.notification?.title}: ${payload.notification?.body}`);
    });
  }
}