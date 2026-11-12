import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, switchMap, tap } from 'rxjs';

export type UserRole = 'ROLE_PATIENT' | 'ROLE_DOCTOR' | 'ROLE_ADMIN';

export interface SessionUser {
  email: string;
  role: UserRole;
}

export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
}

interface JwtPayload {
  sub?: string;
  roles?: string[];
  exp?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenState = signal<string | null>(null);
  private readonly userState = signal<SessionUser | null>(null);

  readonly user = this.userState.asReadonly();
  readonly authenticated = computed(() => this.userState() !== null);

  accessToken(): string | null {
    return this.tokenState();
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>('/api/v1/auth/login', { email, password }).pipe(
      map(response => this.readSession(response.accessToken)),
      tap(({ token, user }) => {
        this.tokenState.set(token);
        this.userState.set(user);
      }),
      map(({ user }) => user)
    );
  }

  register(details: RegisterForm) {
    return this.http.post('/api/v1/auth/register', details).pipe(
      switchMap(() => this.login(details.email, details.password))
    );
  }

  logout(): void {
    this.userState.set(null);
    this.tokenState.set(null);
  }

  private readSession(token: string): { token: string; user: SessionUser } {
    // El frontend solo interpreta estas claims para la interfaz.
    // La validación real de la firma y los permisos siempre la hace Spring Security.
    try {
      const encoded = token.split('.')[1];
      if (!encoded) throw new Error('JWT incompleto');

      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64)) as JwtPayload;
      const validRoles: UserRole[] = ['ROLE_PATIENT', 'ROLE_DOCTOR', 'ROLE_ADMIN'];
      const role = payload.roles?.find(value => validRoles.includes(value as UserRole)) as UserRole | undefined;

      if (!payload.sub || !role || (payload.exp !== undefined && payload.exp * 1000 <= Date.now())) {
        throw new Error('JWT sin identidad o vencido');
      }

      return { token, user: { email: payload.sub, role } };
    } catch {
      throw new Error('El servidor devolvió una sesión no válida. Intenta iniciar sesión de nuevo.');
    }
  }
}
