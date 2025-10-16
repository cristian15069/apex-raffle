import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// Importaciones de Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideCharts(withDefaultRegisterables()),
    provideFirebaseApp(() => initializeApp({ 
      projectId: "apex-raffle", 
      appId: "1:524032460881:web:60f959b6a4f83cd8ad5070", 
      storageBucket: "apex-raffle.firebasestorage.app", 
      apiKey: "AIzaSyDaI8pJFfldvbHsjAySesbphldYT0ZeGtA", 
      authDomain: "apex-raffle.firebaseapp.com", 
      messagingSenderId: "524032460881", 
      measurementId: "G-5D9Q0BCB3V" 
    })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
    provideStorage(() => getStorage())
  ]
};
