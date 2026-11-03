import { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { SessionService } from '../core/auth/session.service';
import { Perfil } from '../core/auth/usuario';
import { Notificador } from '../core/notificacao/notificador';
import { criarNotificador } from './auth/testes-auth';

export function provedoresApp(notificador: jasmine.SpyObj<Notificador> = criarNotificador()): (Provider | EnvironmentProviders)[] {
  return [provideIonicAngular(), provideRouter([]), { provide: Notificador, useValue: notificador }];
}

export function logar(sessao: SessionService, nome = 'Ana Souza', perfil: Perfil = 'ALUNO'): void {
  sessao.iniciar('TK', { id: 1, nome, email: 'ana@example.com', perfil });
}
