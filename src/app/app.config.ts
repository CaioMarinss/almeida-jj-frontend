import { ApplicationConfig, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { sessaoExpiradaInterceptor } from './core/http/sessao-expirada.interceptor';
import { Notificador } from './core/notificacao/notificador';
import { IonicNotificador } from './core/notificacao/ionic-notificador';
import { AtualizacaoAppService } from './core/pwa/atualizacao-app.service';

const reduzirMovimento = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const appConfig: ApplicationConfig = {
    providers: [
        provideIonicAngular({ mode: 'md', animated: !reduzirMovimento }),
        provideRouter(routes),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor, sessaoExpiradaInterceptor])),
        { provide: Notificador, useClass: IonicNotificador },
        provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' }),
        provideAppInitializer(() => inject(AtualizacaoAppService).iniciar())
    ]
};