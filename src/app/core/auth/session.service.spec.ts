import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';
import { Usuario } from './usuario';

describe('SessionService', () => {
  const usuario: Usuario = { id: 1, nome: 'Ana', email: 'ana@example.com', perfil: 'ALUNO' };

  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  function nova(): SessionService {
    TestBed.resetTestingModule();
    return TestBed.inject(SessionService);
  }

  it('persiste a sessão e recupera numa nova instância', () => {
    nova().iniciar('TK', usuario);

    const recuperada = nova();
    expect(recuperada.autenticado()).toBeTrue();
    expect(recuperada.usuario()).toEqual(usuario);
    expect(recuperada.token()).toBe('TK');
  });

  it('encerrar limpa tudo', () => {
    const sessao = nova();
    sessao.iniciar('TK', usuario);

    sessao.encerrar();

    expect(sessao.autenticado()).toBeFalse();
    expect(sessao.token()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('trata JSON corrompido como deslogado', () => {
    sessionStorage.setItem('ajj.token', 'TK');
    sessionStorage.setItem('ajj.usuario', '{quebrado');

    expect(nova().autenticado()).toBeFalse();
  });

  it('trata o formato antigo como deslogado', () => {
    sessionStorage.setItem('auth-token', 'TK');
    sessionStorage.setItem('username', 'Ana');

    expect(nova().autenticado()).toBeFalse();
  });

  it('atualizarNome muda o signal e a sessão', () => {
    const sessao = nova();
    sessao.iniciar('TK', usuario);

    sessao.atualizarNome('Ana Maria');

    expect(sessao.usuario()?.nome).toBe('Ana Maria');
    expect(nova().usuario()?.nome).toBe('Ana Maria');
  });
});
