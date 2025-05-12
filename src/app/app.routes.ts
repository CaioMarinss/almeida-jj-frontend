import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { CadastroComponent } from './pages/cadastro/cadastro.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AuthGuard } from './services/authguard.service';
import { EsqueciSenhaComponent } from './pages/esquecisenha/esquecisenha.component';
import { ResetarComponent } from './pages/resetar/resetar.component';
import { VerificarEmailComponent } from './pages/verificaremail/verificaremail.component';
import { VerificarComponent } from './pages/verificar/verificar.component';

export const routes: Routes = [
    {
        path: '',
        component: LoginComponent
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'cadastro',
        component: CadastroComponent
    },
    {
        path: 'esquecisenha',
        component: EsqueciSenhaComponent
    },
    {
        path: 'verificaremail',
        component: VerificarEmailComponent
    },
    {
        path: 'resetar',
        component: ResetarComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'verificar',
        component: VerificarComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard]
    }
];