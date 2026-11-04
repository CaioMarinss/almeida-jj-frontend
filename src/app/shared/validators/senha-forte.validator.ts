import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export type RegraSenha = 'tamanho' | 'maiuscula' | 'minuscula' | 'numero' | 'especial' | 'semEspaco';

export const TAMANHO_MINIMO_SENHA = 8;

export interface DefinicaoRegraSenha {
  readonly id: RegraSenha;
  readonly rotulo: string;
  readonly cumpre: (senha: string) => boolean;
}

export const REGRAS_SENHA: readonly DefinicaoRegraSenha[] = [
  { id: 'tamanho', rotulo: `Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`, cumpre: senha => [...senha].length >= TAMANHO_MINIMO_SENHA },
  { id: 'maiuscula', rotulo: 'Uma letra maiúscula', cumpre: senha => /\p{Lu}/u.test(senha) },
  { id: 'minuscula', rotulo: 'Uma letra minúscula', cumpre: senha => /\p{Ll}/u.test(senha) },
  { id: 'numero', rotulo: 'Um número', cumpre: senha => /\p{Nd}/u.test(senha) },
  { id: 'especial', rotulo: 'Um caractere especial (ex.: ! @ # $ %)', cumpre: senha => /[^\p{L}\p{Nd}\s]/u.test(senha) },
  { id: 'semEspaco', rotulo: 'Sem espaços', cumpre: senha => senha.length > 0 && !/\s/u.test(senha) }
];

export function regrasNaoCumpridas(senha: string): RegraSenha[] {
  return REGRAS_SENHA.filter(regra => !regra.cumpre(senha)).map(regra => regra.id);
}

export function senhaForteValidator(): ValidatorFn {
  return (controle: AbstractControl): ValidationErrors | null => {
    const senha = typeof controle.value === 'string' ? controle.value : '';
    if (!senha) {
      return null;
    }
    const faltando = regrasNaoCumpridas(senha);
    return faltando.length ? { senhaFraca: { faltando } } : null;
  };
}
