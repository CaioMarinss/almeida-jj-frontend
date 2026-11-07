import { compararNomes, contemNome, normalizarBusca, paginar, TAMANHO_PAGINA_DONO } from './texto.util';

describe('texto.util', () => {
  it('"CONCEIÇAO" acha "Conceição"', () => {
    expect(contemNome('Conceição', 'CONCEIÇAO')).toBeTrue();
  });

  it('"  joão " acha "João"', () => {
    expect(contemNome('João', '  joão ')).toBeTrue();
  });

  it('"joao" acha "JOÃO PEDRO"', () => {
    expect(contemNome('JOÃO PEDRO', 'joao')).toBeTrue();
  });

  it('busca vazia acha todos', () => {
    expect(contemNome('Qualquer', '')).toBeTrue();
    expect(contemNome('Qualquer', '   ')).toBeTrue();
  });

  it('normaliza acento, caixa e espaços', () => {
    expect(normalizarBusca('  ÁLVARO ')).toBe('alvaro');
  });

  it('ordena "Álvaro" antes de "Bruno" e "ana" junto de "Ana"', () => {
    const lista = [
      { nome: 'Bruno', id: 1 },
      { nome: 'Álvaro', id: 2 },
      { nome: 'Carla', id: 3 }
    ].sort(compararNomes);
    expect(lista.map(i => i.nome)).toEqual(['Álvaro', 'Bruno', 'Carla']);
    expect(compararNomes({ nome: 'ana', id: 1 }, { nome: 'Ana', id: 2 })).toBeLessThan(0);
    expect(compararNomes({ nome: 'ana', id: 1 }, { nome: 'Bia', id: 2 })).toBeLessThan(0);
  });

  it('empate no nome ordena pelo id', () => {
    expect(compararNomes({ nome: 'Ana', id: 5 }, { nome: 'ana', id: 2 })).toBeGreaterThan(0);
  });

  it('paginar 15 itens em 7 → 3 páginas, a 3ª com 1', () => {
    const itens = Array.from({ length: 15 }, (_, i) => i);
    const r = paginar(itens, 3, TAMANHO_PAGINA_DONO);
    expect(r.totalPaginas).toBe(3);
    expect(r.itens).toEqual([14]);
    expect(paginar(itens, 1, 7).itens.length).toBe(7);
  });

  it('página 5 de 3 volta para 3', () => {
    const itens = Array.from({ length: 15 }, (_, i) => i);
    expect(paginar(itens, 5, 7).pagina).toBe(3);
    expect(paginar(itens, 0, 7).pagina).toBe(1);
  });

  it('lista vazia → 1 página vazia', () => {
    expect(paginar([], 1, 7)).toEqual({ itens: [], pagina: 1, totalPaginas: 1 });
  });
});
