import { EnvironmentProviders, Provider } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNgxMask } from 'ngx-mask';
import { AuthService } from '../../core/auth/auth.service';
import { Notificador } from '../../core/notificacao/notificador';

export function criarAuthService(): jasmine.SpyObj<AuthService> {
  return jasmine.createSpyObj<AuthService>('AuthService', [
    'login',
    'cadastrar',
    'verificarEmail',
    'reenviarVerificacao',
    'esqueciSenha',
    'redefinirSenha'
  ]);
}

export function criarNotificador(): jasmine.SpyObj<Notificador> {
  const notificador = jasmine.createSpyObj<Notificador>('Notificador', ['sucesso', 'erro', 'aviso', 'erroDaApi', 'confirmar']);
  notificador.sucesso.and.resolveTo();
  notificador.erro.and.resolveTo();
  notificador.aviso.and.resolveTo();
  notificador.erroDaApi.and.resolveTo();
  notificador.confirmar.and.resolveTo(true);
  return notificador;
}

export function provedoresAuth(
  auth: jasmine.SpyObj<AuthService>,
  notificador: jasmine.SpyObj<Notificador>,
  query: Record<string, string> = {}
): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter([]),
    provideNgxMask(),
    { provide: AuthService, useValue: auth },
    { provide: Notificador, useValue: notificador },
    { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } }
  ];
}
