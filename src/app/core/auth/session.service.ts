import { computed, Injectable, signal } from '@angular/core';
import { Usuario } from './usuario';

const CHAVE_TOKEN = 'ajj.token';
const CHAVE_USUARIO = 'ajj.usuario';

function expirado(token: string): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload)) as { exp?: unknown };
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly tokenAtual = signal<string | null>(null);
  private readonly usuarioAtual = signal<Usuario | null>(null);

  readonly usuario = this.usuarioAtual.asReadonly();
  readonly autenticado = computed(() => this.tokenAtual() !== null && this.usuarioAtual() !== null);

  constructor() {
    this.restaurar();
  }

  token(): string | null {
    return this.tokenAtual();
  }

  iniciar(token: string, usuario: Usuario): void {
    sessionStorage.setItem(CHAVE_TOKEN, token);
    sessionStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
    this.tokenAtual.set(token);
    this.usuarioAtual.set(usuario);
  }

  sessaoValida(): boolean {
    const token = this.tokenAtual();
    if (!token || !this.usuarioAtual()) {
      return false;
    }
    if (expirado(token)) {
      this.encerrar();
      return false;
    }
    return true;
  }

  encerrar(): void {
    sessionStorage.removeItem(CHAVE_TOKEN);
    sessionStorage.removeItem(CHAVE_USUARIO);
    this.tokenAtual.set(null);
    this.usuarioAtual.set(null);
  }

  private restaurar(): void {
    const token = sessionStorage.getItem(CHAVE_TOKEN);
    const usuario = this.lerUsuario();
    if (token && usuario && !expirado(token)) {
      this.tokenAtual.set(token);
      this.usuarioAtual.set(usuario);
    } else {
      this.encerrar();
    }
  }

  private lerUsuario(): Usuario | null {
    try {
      const bruto = sessionStorage.getItem(CHAVE_USUARIO);
      return bruto ? (JSON.parse(bruto) as Usuario) : null;
    } catch {
      return null;
    }
  }
}
