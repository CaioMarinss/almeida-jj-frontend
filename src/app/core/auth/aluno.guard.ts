import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';
import { rotaInicial } from './usuario';

export const alunoGuard: CanActivateFn = () => {
  const perfil = inject(SessionService).usuario()?.perfil;
  return perfil !== 'DONO' || inject(Router).createUrlTree([rotaInicial(perfil)]);
};
