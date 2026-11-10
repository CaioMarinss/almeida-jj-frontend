import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PessoaAcademia } from '../../professores/professores.service';
import { provedoresApp } from '../../testes-app';
import { IncluirAlunoComponent } from './incluir-aluno.component';

describe('IncluirAlunoComponent', () => {
  const joao: PessoaAcademia = { id: 2, nome: 'João Alves', email: 'joao@x.com', perfil: 'ALUNO' };
  const bia: PessoaAcademia = { id: 3, nome: 'Bia Souza', email: 'bia@x.com', perfil: 'ALUNO' };
  let fixture: ComponentFixture<IncluirAlunoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [IncluirAlunoComponent], providers: provedoresApp() });
    fixture = TestBed.createComponent(IncluirAlunoComponent);
    fixture.componentRef.setInput('pessoas', [joao, bia]);
    fixture.detectChanges();
  });

  const nomes = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('button.pessoa strong')).map(e => e.textContent?.trim() ?? '');

  function digitar(valor: string): void {
    const campo: HTMLInputElement = fixture.nativeElement.querySelector('#busca-incluir');
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('lista as pessoas por nome', () => {
    expect(nomes()).toEqual(['Bia Souza', 'João Alves']);
  });

  it('busca sem acento nem caixa', () => {
    digitar('JOAO');

    expect(nomes()).toEqual(['João Alves']);
  });

  it('sem resultado mostra aviso', () => {
    digitar('zzz');

    expect(nomes()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Nenhum aluno encontrado');
  });

  const confirmar = (): HTMLButtonElement => fixture.nativeElement.querySelector('button.confirmar');

  function tocar(indice: number): void {
    fixture.nativeElement.querySelectorAll('button.pessoa')[indice].click();
    fixture.detectChanges();
  }

  it('tocar marca e desmarca a pessoa sem emitir', () => {
    const emitidas: PessoaAcademia[][] = [];
    fixture.componentInstance.escolher.subscribe(p => emitidas.push(p));
    expect(confirmar().disabled).toBeTrue();
    expect(confirmar().textContent?.trim()).toBe('Incluir');

    tocar(0);
    expect(fixture.nativeElement.querySelector('button.pessoa').getAttribute('aria-pressed')).toBe('true');
    expect(confirmar().textContent?.trim()).toBe('Incluir 1 aluno');
    tocar(0);
    expect(fixture.nativeElement.querySelector('button.pessoa').getAttribute('aria-pressed')).toBe('false');

    expect(emitidas).toEqual([]);
  });

  it('confirmar emite todas as marcadas, mesmo fora da busca atual', () => {
    const emitidas: PessoaAcademia[][] = [];
    fixture.componentInstance.escolher.subscribe(p => emitidas.push(p));

    tocar(1);
    digitar('bia');
    tocar(0);
    expect(confirmar().textContent?.trim()).toBe('Incluir 2 alunos');
    confirmar().click();

    expect(emitidas).toEqual([[bia, joao]]);
  });

  it('quem sai da lista deixa de contar como marcado', () => {
    tocar(0);
    fixture.componentRef.setInput('pessoas', [joao]);
    fixture.detectChanges();

    expect(fixture.componentInstance.escolhidas()).toEqual([]);
    expect(confirmar().disabled).toBeTrue();
  });

  it('desabilita as linhas enquanto salva', () => {
    fixture.componentRef.setInput('salvando', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button.pessoa').disabled).toBeTrue();
    expect(confirmar().disabled).toBeTrue();
  });
});
