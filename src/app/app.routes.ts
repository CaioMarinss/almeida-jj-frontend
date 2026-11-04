import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { donoGuard } from './core/auth/dono.guard';
import { visitanteGuard } from './core/auth/visitante.guard';

const login = () => import('./features/auth/login/login.component').then(m => m.LoginComponent);

export const routes: Routes = [
  { path: '', canActivate: [visitanteGuard], loadComponent: login },
  { path: 'login', canActivate: [visitanteGuard], loadComponent: login },
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
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: 'inicio', loadComponent: () => import('./features/inicio/inicio.component').then(m => m.InicioComponent) },
      { path: 'aulas', loadComponent: () => import('./features/aulas/aulas.component').then(m => m.AulasComponent) },
      {
        path: 'presenca',
        loadComponent: () => import('./features/presenca/presenca.component').then(m => m.PresencaComponent)
      },
      {
        path: 'financeiro',
        loadComponent: () => import('./features/financeiro/financeiro.component').then(m => m.FinanceiroComponent)
      },
      { path: 'perfil', loadComponent: () => import('./features/perfil/perfil.component').then(m => m.PerfilComponent) },
      {
        path: 'professores',
        canActivate: [donoGuard],
        loadComponent: () => import('./features/professores/professores.component').then(m => m.ProfessoresComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'inicio' }
    ]
  },
  { path: 'dashboard', redirectTo: 'app/inicio' },
  { path: 'calendario', redirectTo: 'app/aulas' },
  { path: 'financeiro', redirectTo: 'app/financeiro' },
  { path: 'configuracoes', redirectTo: 'app/perfil' },
  { path: '**', redirectTo: '' }
];
