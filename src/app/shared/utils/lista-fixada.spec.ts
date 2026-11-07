import { computed, signal } from '@angular/core';
import { criarListaFixada } from './lista-fixada';

interface Item {
  id: number;
  grupo: string;
}

describe('criarListaFixada', () => {
  function montar() {
    const todos = signal<Item[]>(Array.from({ length: 10 }, (_, i): Item => ({ id: i + 1, grupo: i < 5 ? 'a' : 'b' })));
    const grupo = signal('a');
    const pagina = signal(1);
    const filtrados = computed(() => todos().filter(i => i.grupo === grupo()));
    const lista = criarListaFixada(todos, filtrados, pagina, 3);
    return { todos, grupo, pagina, lista };
  }

  it('sem fixação pagina a lista filtrada', () => {
    const { lista } = montar();

    expect(lista.visiveis().map(i => i.id)).toEqual([1, 2, 3]);
    expect(lista.paginaExibida()).toBe(1);
    expect(lista.totalPaginasExibido()).toBe(2);
    expect(lista.total()).toBe(5);
  });

  it('com fixação a linha alterada continua visível e pager e total ficam congelados', () => {
    const { todos, lista } = montar();

    lista.fixar();
    todos.update(l => l.map(i => (i.id === 2 ? { ...i, grupo: 'b' } : i)));

    expect(lista.visiveis().map(i => i.id)).toEqual([1, 2, 3]);
    expect(lista.visiveis()[1].grupo).toBe('b');
    expect(lista.totalPaginasExibido()).toBe(2);
    expect(lista.total()).toBe(5);
  });

  it('só tira o primeiro retrato', () => {
    const { todos, lista } = montar();

    lista.fixar();
    todos.update(l => l.map(i => (i.id === 2 ? { ...i, grupo: 'b' } : i)));
    lista.fixar();

    expect(lista.visiveis().map(i => i.id)).toEqual([1, 2, 3]);
    expect(lista.total()).toBe(5);
  });

  it('item removido da lista some da fixação', () => {
    const { todos, lista } = montar();

    lista.fixar();
    todos.update(l => l.filter(i => i.id !== 2));

    expect(lista.visiveis().map(i => i.id)).toEqual([1, 3]);
  });

  it('soltar volta a derivar da lista filtrada', () => {
    const { todos, lista } = montar();

    lista.fixar();
    todos.update(l => l.map(i => (i.id === 2 ? { ...i, grupo: 'b' } : i)));
    lista.soltar();

    expect(lista.visiveis().map(i => i.id)).toEqual([1, 3, 4]);
    expect(lista.total()).toBe(4);
    expect(lista.totalPaginasExibido()).toBe(2);
  });

  it('segue a página pedida', () => {
    const { pagina, lista } = montar();

    pagina.set(2);

    expect(lista.visiveis().map(i => i.id)).toEqual([4, 5]);
    expect(lista.paginaExibida()).toBe(2);
  });
});
