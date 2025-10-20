import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-login',
  imports: [FormsModule,CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  passwordVisible = false;
  isLoading = false;

  authService = inject(AuthService);
  router = inject(Router);

  async onSubmit() {
    console.log('Intentando iniciar sesión con el correo:', this.email); 
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, completa ambos campos.';
      return;
    }
    try {
      await this.authService.login(this.email, this.password);
      this.router.navigate(['/gallery']); 
    } catch (error) {
      this.errorMessage = 'Correo o contraseña incorrectos.';
      console.error('Error de inicio de sesión:', error);
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }
  
}
