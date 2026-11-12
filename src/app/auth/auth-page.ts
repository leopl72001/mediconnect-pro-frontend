import { Component, output, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [FormsModule],
  templateUrl: './auth-page.html'
})
export class AuthPage {
  readonly enterDemo = output<void>();
  private readonly auth = inject(AuthService);
  readonly mode = signal<'login' | 'register'>('login');
  readonly busy = signal(false);
  readonly errorMessage = signal('');

  email = '';
  password = '';
  firstName = '';
  lastName = '';

  selectMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.errorMessage.set('');
  }

  submit(): void {
    if (this.busy()) return;

    const email = this.email.trim();
    if (!email || !this.password || (this.mode() === 'register' &&
        (!this.firstName.trim() || !this.lastName.trim() || this.password.length < 8))) {
      this.errorMessage.set('Revisa los datos del formulario. La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    this.busy.set(true);
    this.errorMessage.set('');
    const request = this.mode() === 'login'
      ? this.auth.login(email, this.password)
      : this.auth.register({
          email, password: this.password,
          firstName: this.firstName.trim(), lastName: this.lastName.trim()
        });

    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.password = ''; },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          this.errorMessage.set(error.status === 0
            ? 'No se pudo conectar con Spring Boot. Comprueba Docker y el puerto 8082.'
            : error.status === 401
              ? 'Correo o contraseña incorrectos.'
              : error.status === 409
                ? 'Este correo ya está registrado. Inicia sesión.'
                : error.status === 400
                  ? 'Datos no válidos. Comprueba los campos e inténtalo de nuevo.'
                  : 'No se pudo completar la operación. Inténtalo más tarde.');
        } else {
          this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
        }
      }
    });
  }
}
