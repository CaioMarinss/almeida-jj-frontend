import { computed, Signal, signal } from '@angular/core';
import { paginar, TAMANHO_PAGINA_DONO } from './texto.util';

interface Fixacao {
  ids: number[];
  pagina: number;
  totalPaginas: number;
  total: number;
}

export interface ListaFixada<T> {
  readonly visiveis: Signal<T[]>;
  readonly paginaExibida: Signal<number>;
  readonly totalPaginasExibido: Signal<number>;
  readonly total: Signal<number>;
  fixar(): void;
  soltar(): void;
}

export function criarListaFixada<T extends { id: number }>(
  todos: Signal<T[]>,
  filtrados: Signal<T[]>,
  pagina: Signal<number>,
  tamanho: number = TAMANHO_PAGINA_DONO
): ListaFixada<T> {
  const fixacao = signal<Fixacao | null>(null);
  const paginada = computed(() => paginar(filtrados(), pagina(), tamanho));
  const visiveis = computed(() => {
    const atual = fixacao();
    if (atual === null) {
      return paginada().itens;
    }
    const porId = new Map(todos().map(item => [item.id, item]));
    return atual.ids.flatMap(id => porId.get(id) ?? []);
  });

  return {
    visiveis,
    paginaExibida: computed(() => fixacao()?.pagina ?? paginada().pagina),
    totalPaginasExibido: computed(() => fixacao()?.totalPaginas ?? paginada().totalPaginas),
    total: computed(() => fixacao()?.total ?? filtrados().length),
    fixar: () => {
      if (fixacao() === null) {
        const { pagina: paginaAtual, totalPaginas } = paginada();
        fixacao.set({
          ids: visiveis().map(item => item.id),
          pagina: paginaAtual,
          totalPaginas,
          total: filtrados().length
        });
      }
    },
    soltar: () => fixacao.set(null)
  };
}
