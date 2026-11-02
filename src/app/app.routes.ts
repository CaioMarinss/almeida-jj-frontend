import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { CadastroComponent } from './features/auth/cadastro/cadastro.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AuthGuard } from './services/login/authguard.service';
import { EsqueciSenhaComponent } from './features/auth/esqueci-senha/esqueci-senha.component';
import { RedefinirSenhaComponent } from './features/auth/redefinir-senha/redefinir-senha.component';
import { ReenviarVerificacaoComponent } from './features/auth/reenviar-verificacao/reenviar-verificacao.component';
import { VerificarComponent } from './features/auth/verificar/verificar.component';
import { CalendarioComponent } from './pages/calendario/calendario.component';
import { ConfiguracoesComponent } from './pages/configuracoes/configuracoes.component';
import { FinanceiroComponent } from './pages/financeiro/financeiro.component';

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
        component: ReenviarVerificacaoComponent
    },
    {
        path: 'resetar',
        component: RedefinirSenhaComponent,
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
    },
    {
        path: 'calendario',
        component: CalendarioComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'configuracoes',
        component: ConfiguracoesComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'financeiro',
        component: FinanceiroComponent,
        canActivate: [AuthGuard]
    }
];