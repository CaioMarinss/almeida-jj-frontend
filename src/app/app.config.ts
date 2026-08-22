import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideToastr } from 'ngx-toastr';
import { provideNgxMask } from 'ngx-mask';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes'; // <- aqui você importa as rotas



export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideAnimationsAsync(),
        provideToastr(),
        provideNgxMask(),
        providePrimeNG({
            theme: {
                preset: Aura
            }
        }),
        provideHttpClient(withFetch()),
        
    ]
};