// src/app/app.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth'; // Asegúrate de que esta ruta sea correcta

@Component({
  selector: 'app-root',
  standalone: true,
  // ✅ Asegúrate de que los imports aquí sean los que tu HTML necesita
  imports: [CommonModule, RouterModule, RouterOutlet], 
  templateUrl: './app.html', // El nombre de tu plantilla
  styleUrls: ['./app.css']  // El nombre de tus estilos
})
export class App { // Usamos el nombre estándar "AppComponent"
  
  // ✅ CORRECCIÓN PRINCIPAL: Inyectamos el servicio en el constructor
  // La palabra 'public' es la clave para que el HTML pueda "ver" authService.
  constructor(public authService: AuthService) {}

  /**
   * Método para cerrar la sesión del usuario.
   */
  logout() {
    this.authService.logout();
  }
}