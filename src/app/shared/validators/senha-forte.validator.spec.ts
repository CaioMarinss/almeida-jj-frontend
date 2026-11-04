import { FormControl } from '@angular/forms';
import { REGRAS_SENHA, regrasNaoCumpridas, senhaForteValidator } from './senha-forte.validator';

describe('senhaForteValidator', () => {
  const validar = (valor: unknown) => senhaForteValidator()(new FormControl(valor));

  const validas = [
    'Senha@123',
    'Aa1!aaaa',
    'SENHA#1a',
    'Abcdef1_',
    'Çedilha9!',
    'MAIÚSCULO1é!',
    'Ab1!Ab1!Ab1!Ab1!',
    'Aa1😀aaaa',
    'Aa1-aaaa',
    'Aa1\\aaaa',
    'Aa1"aaaa'
  ];
  validas.forEach(senha => {
    it(`aceita "${senha}"`, () => {
      expect(validar(senha)).toBeNull();
    });
  });

  '!@#$%&*()_+=[]{};:,<>/?|`\'~.-'.split('').forEach(simbolo => {
    it(`aceita "${simbolo}" como caractere especial`, () => {
      expect(validar(`Abcdef1${simbolo}`)).toBeNull();
    });
  });

  it('deixa o vazio para o required', () => {
    expect(validar('')).toBeNull();
    expect(validar(null)).toBeNull();
  });

  it('aceita exatamente 8 caracteres e recusa 7', () => {
    expect(validar('Abcde1!x')).toBeNull();
    expect(validar('Abcd1!x')).toEqual({ senhaFraca: { faltando: ['tamanho'] } });
  });

  it('conta caracteres e não unidades UTF-16', () => {
    expect(validar('Aa1😀😀😀😀')).toEqual({ senhaFraca: { faltando: ['tamanho'] } });
  });

  const faltaUma: [string, string][] = [
    ['senha@123', 'maiuscula'],
    ['SENHA@123', 'minuscula'],
    ['Senha@abc', 'numero'],
    ['Senha1234', 'especial']
  ];
  faltaUma.forEach(([senha, regra]) => {
    it(`aponta só "${regra}" em "${senha}"`, () => {
      expect(validar(senha)).toEqual({ senhaFraca: { faltando: [regra] } });
    });
  });

  it('letra com acento conta como letra e não como especial', () => {
    expect(regrasNaoCumpridas('Senhaçé12')).toEqual(['especial']);
  });

  ['Senha@ 123', ' Senha@123', 'Senha@123 ', 'Senha@\t123', 'Senha@\n123', 'Senha@ 123'].forEach(senha => {
    it(`recusa espaço em ${JSON.stringify(senha)}`, () => {
      expect(validar(senha)).toEqual({ senhaFraca: { faltando: ['semEspaco'] } });
    });
  });

  it('espaço não conta como caractere especial', () => {
    expect(regrasNaoCumpridas('Senha 123')).toEqual(['especial', 'semEspaco']);
  });

  it('lista todas as regras que faltam na ordem da tela', () => {
    expect(regrasNaoCumpridas('abc')).toEqual(['tamanho', 'maiuscula', 'numero', 'especial']);
  });

  it('senha vazia não cumpre nenhuma regra na lista', () => {
    expect(regrasNaoCumpridas('')).toEqual(REGRAS_SENHA.map(r => r.id));
  });
});
