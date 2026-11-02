import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideNgxMask } from 'ngx-mask';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes'; // <- aqui você importa as rotas



export const appConfig: ApplicationConfig = {
    providers: [
        // Angular 21+ é zoneless por padrão; mantém a detecção de mudanças via zone.js.
        provideZoneChangeDetection(),
        provideRouter(routes),
        provideNgxMask(),
        provideHttpClient(withFetch()),
        
    ]
};