import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const authGuard: CanActivateFn = () =>
  inject(SessionService).sessaoValida() || inject(Router).createUrlTree(['/login']);
