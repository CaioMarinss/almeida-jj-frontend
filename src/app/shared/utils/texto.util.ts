export const TAMANHO_PAGINA_DONO = 7;

const colador = new Intl.Collator('pt-BR', { sensitivity: 'base' });

export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export function contemNome(nome: string, busca: string): boolean {
  const termo = normalizarBusca(busca);
  return termo === '' || normalizarBusca(nome).includes(termo);
}

export function compararNomes(a: { nome: string; id: number }, b: { nome: string; id: number }): number {
  return colador.compare(a.nome, b.nome) || a.id - b.id;
}

export function paginar<T>(
  itens: T[],
  pagina: number,
  tamanho: number
): { itens: T[]; pagina: number; totalPaginas: number } {
  const totalPaginas = Math.max(1, Math.ceil(itens.length / tamanho));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (atual - 1) * tamanho;
  return { itens: itens.slice(inicio, inicio + tamanho), pagina: atual, totalPaginas };
}
