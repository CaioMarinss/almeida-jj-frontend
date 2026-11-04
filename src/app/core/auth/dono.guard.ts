import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const donoGuard: CanActivateFn = () =>
  inject(SessionService).usuario()?.perfil === 'DONO' || inject(Router).createUrlTree(['/app/inicio']);
