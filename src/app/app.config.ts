import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideNgxMask } from 'ngx-mask';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes'; // <- aqui você importa as rotas



export const appConfig: ApplicationConfig = {
    providers: [
        // Angular 21+ é zoneless por padrão; mantém a detecção de mudanças via zone.js.
        provideZoneChangeDetection(),
        provideRouter(routes),
        provideAnimationsAsync(),
        provideNgxMask(),
        providePrimeNG({
            theme: {
                preset: Aura
            }
        }),
        provideHttpClient(withFetch()),
        
    ]
};