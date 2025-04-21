import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideToastr } from 'ngx-toastr';


export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimationsAsync(),
        provideToastr(),
        providePrimeNG({
            theme: {
                preset: Aura
            }
        }),
        provideHttpClient(withFetch()),
        
    ]
};