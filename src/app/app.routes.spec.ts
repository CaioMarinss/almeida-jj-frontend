import { routes } from './app.routes';

describe('rotas', () => {
  const rota = (path: string) => routes.find(r => r.path === path);

  it('verificar e resetar são públicas', () => {
    expect(rota('verificar')?.canActivate).toBeUndefined();
    expect(rota('resetar')?.canActivate).toBeUndefined();
  });

  it('a área logada exige autenticação', () => {
    for (const path of ['dashboard', 'calendario', 'financeiro', 'configuracoes']) {
      expect(rota(path)?.canActivate?.length).withContext(path).toBe(1);
    }
  });

  it('todas as rotas com tela são lazy', () => {
    expect(routes.filter(r => r.component)).toEqual([]);
  });
});
