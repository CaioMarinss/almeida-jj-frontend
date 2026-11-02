import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideNgxMask } from 'ngx-mask';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { sessaoExpiradaInterceptor } from './core/http/sessao-expirada.interceptor';
import { Notificador } from './core/notificacao/notificador';
import { IonicNotificador } from './core/notificacao/ionic-notificador';

export const appConfig: ApplicationConfig = {
    providers: [
        provideIonicAngular({ mode: 'md' }),
        provideRouter(routes),
        provideNgxMask(),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor, sessaoExpiradaInterceptor])),
        { provide: Notificador, useClass: IonicNotificador }
    ]
};