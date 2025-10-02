import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent {
  // authService = inject(AuthService);
  // router = inject(Router);

  // user$ = this.authService.user$;
  // userProfile$ = this.authService.userProfile$;

  // async logout (): Promise<void> {
  //   try {
  //     await this.authService.logout();
  //     this.router.navigate(['/login']);
  //   } catch (error) {
  //     console.error('Error al cerrar sesión:', error);
  //   }
  // }
}
