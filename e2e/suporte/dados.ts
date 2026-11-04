import { randomInt, randomUUID } from 'node:crypto';

export const SENHA_FORTE = 'Treino@2026';
export const OUTRA_SENHA_FORTE = 'Faixa#Preta9';

export function emailUnico(): string {
  return `aluno-${randomUUID().slice(0, 12)}@e2e.test`;
}

export function cpfValido(): string {
  const base = Array.from({ length: 9 }, () => randomInt(10));
  if (base.every(d => d === base[0])) {
    base[0] = (base[0] + 1) % 10;
  }
  const digito = (numeros: number[]) => {
    const soma = numeros.reduce((total, d, i) => total + d * (numeros.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const primeiro = digito(base);
  const segundo = digito([...base, primeiro]);
  return [...base, primeiro, segundo].join('');
}
