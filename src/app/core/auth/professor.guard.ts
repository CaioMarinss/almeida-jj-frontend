import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const professorGuard: CanActivateFn = () => {
  const perfil = inject(SessionService).usuario()?.perfil;
  return perfil === 'PROFESSOR' || perfil === 'DONO' || inject(Router).createUrlTree(['/app/inicio']);
};
