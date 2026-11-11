import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';
import { rotaInicial } from './usuario';

export const visitanteGuard: CanActivateFn = () => {
  const sessao = inject(SessionService);
  return !sessao.sessaoValida() || inject(Router).createUrlTree([rotaInicial(sessao.usuario()?.perfil)]);
};
