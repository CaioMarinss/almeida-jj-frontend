import { Route } from '@angular/router';
import { donoGuard } from './core/auth/dono.guard';
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
    expect(filhos().map(r => r.path)).toEqual(['inicio', 'aulas', 'presenca', 'financeiro', 'perfil', 'professores', '']);
  });

  it('professores só abre para o dono', () => {
    expect(filhos().find(r => r.path === 'professores')?.canActivate).toEqual([donoGuard]);
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
