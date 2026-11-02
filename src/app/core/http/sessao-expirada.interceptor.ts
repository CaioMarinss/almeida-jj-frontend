import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from '../auth/session.service';

export const sessaoExpiradaInterceptor: HttpInterceptorFn = (req, next) => {
  const sessao = inject(SessionService);
  const router = inject(Router);
  const rotaPublica = req.url.startsWith(`${environment.apiUrl}/auth/`);

  return next(req).pipe(
    catchError((erro: unknown) => {
      if (!rotaPublica && erro instanceof HttpErrorResponse && erro.status === 401) {
        sessao.encerrar();
        void router.navigateByUrl('/login');
      }
      return throwError(() => erro);
    })
  );
};
