import { Route } from '@angular/router';
import { donoGuard } from './core/auth/dono.guard';
import { alunoGuard } from './core/auth/aluno.guard';
import { routes } from './app.routes';

describe('rotas', () => {
  const rota = (path: string) => routes.find(r => r.path === path);
  const filhos = (): Route[] => rota('app')?.children ?? [];

  it('verificar e resetar são públicas', () => {
    expect(rota('verificar')?.canActivate).toBeUndefined();
    expect(rota('resetar')?.canActivate).toBeUndefined();
  });

  it('a área logada fica em /app e exige autenticação', () => {
    expect(rota('app')?.canActivate?.length).toBe(1);
    expect(filhos().map(r => r.path)).toEqual(['inicio', 'aulas', 'presenca', 'financeiro', 'perfil', 'perfil/senha', 'professores', 'alunos', 'chamada', 'grade', 'agenda', 'graduacao', 'sumidos', '']);
  });

  it('professores só abre para o dono', () => {
    expect(filhos().find(r => r.path === 'professores')?.canActivate).toEqual([donoGuard]);
  });

  it('chamada só abre para o dono', () => {
    expect(filhos().find(r => r.path === 'chamada')?.canActivate).toEqual([donoGuard]);
  });

  it('inicio, aulas e presenca mandam o dono para a chamada', () => {
    for (const path of ['inicio', 'aulas', 'presenca']) {
      expect(filhos().find(r => r.path === path)?.canActivate).toEqual([alunoGuard]);
    }
  });

  it('grade só abre para o dono e agenda redireciona para grade', () => {
    expect(filhos().find(r => r.path === 'grade')?.canActivate).toEqual([donoGuard]);
    expect(filhos().find(r => r.path === 'agenda')?.redirectTo).toBe('grade');
  });

  it('alunos leva por ora à lista de professores, que só abre para o dono', () => {
    expect(filhos().find(r => r.path === 'alunos')?.redirectTo).toBe('professores');
  });

  it('perfil/senha é a tela Trocar senha', () => {
    expect(filhos().find(r => r.path === 'perfil/senha')?.loadComponent).toBeDefined();
  });

  it('sumidos só abre para o dono', () => {
    expect(filhos().find(r => r.path === 'sumidos')?.canActivate).toEqual([donoGuard]);
  });

  it('graduacao só abre para o dono', () => {
    expect(filhos().find(r => r.path === 'graduacao')?.canActivate).toEqual([donoGuard]);
  });

  it('login e raiz levam quem já está logado para o início', () => {
    expect(rota('')?.canActivate?.length).toBe(1);
    expect(rota('login')?.canActivate?.length).toBe(1);
  });

  it('rotas antigas redirecionam para as abas novas', () => {
    expect(rota('dashboard')?.redirectTo).toBe('app/inicio');
    expect(rota('calendario')?.redirectTo).toBe('app/aulas');
    expect(rota('financeiro')?.redirectTo).toBe('app/financeiro');
    expect(rota('configuracoes')?.redirectTo).toBe('app/perfil');
  });

  it('todas as telas são lazy', () => {
    const todas = [...routes, ...filhos()];
    expect(todas.filter(r => r.component)).toEqual([]);
  });
});
