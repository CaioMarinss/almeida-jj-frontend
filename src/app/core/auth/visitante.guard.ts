import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const visitanteGuard: CanActivateFn = () =>
  !inject(SessionService).sessaoValida() || inject(Router).createUrlTree(['/app/inicio']);
