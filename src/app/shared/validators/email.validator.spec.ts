import { FormControl } from '@angular/forms';
import { emailValidator } from './email.validator';

describe('emailValidator', () => {
  const validar = (valor: string) => emailValidator()(new FormControl(valor));

  it('aceita e-mail com espaços nas pontas', () => {
    expect(validar(' Ana@Example.com ')).toBeNull();
  });

  it('recusa e-mail inválido com a chave email', () => {
    expect(validar('ana@')).toEqual({ email: true });
  });

  it('deixa o vazio para o required', () => {
    expect(validar('')).toBeNull();
  });
});
