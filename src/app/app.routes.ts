import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

const login = () => import('./features/auth/login/login.component').then(m => m.LoginComponent);

export const routes: Routes = [
  { path: '', loadComponent: login },
  { path: 'login', loadComponent: login },
  {
    path: 'cadastro',
    loadComponent: () => import('./features/auth/cadastro/cadastro.component').then(m => m.CadastroComponent)
  },
  {
    path: 'esquecisenha',
    loadComponent: () =>
      import('./features/auth/esqueci-senha/esqueci-senha.component').then(m => m.EsqueciSenhaComponent)
  },
  {
    path: 'verificaremail',
    loadComponent: () =>
      import('./features/auth/reenviar-verificacao/reenviar-verificacao.component').then(
        m => m.ReenviarVerificacaoComponent
      )
  },
  {
    path: 'verificar',
    loadComponent: () => import('./features/auth/verificar/verificar.component').then(m => m.VerificarComponent)
  },
  {
    path: 'resetar',
    loadComponent: () =>
      import('./features/auth/redefinir-senha/redefinir-senha.component').then(m => m.RedefinirSenhaComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/inicio/inicio.component').then(m => m.InicioComponent)
  },
  {
    path: 'calendario',
    canActivate: [authGuard],
    loadComponent: () => import('./features/aulas/aulas.component').then(m => m.AulasComponent)
  },
  {
    path: 'financeiro',
    canActivate: [authGuard],
    loadComponent: () => import('./features/financeiro/financeiro.component').then(m => m.FinanceiroComponent)
  },
  {
    path: 'configuracoes',
    canActivate: [authGuard],
    loadComponent: () => import('./features/perfil/perfil.component').then(m => m.PerfilComponent)
  },
  { path: '**', redirectTo: '' }
];
