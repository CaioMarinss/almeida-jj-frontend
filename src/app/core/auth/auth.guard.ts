import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const authGuard: CanActivateFn = () =>
  inject(SessionService).autenticado() || inject(Router).createUrlTree(['/login']);
