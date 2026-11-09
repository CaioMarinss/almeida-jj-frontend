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

  it('tocar numa pessoa emite escolher', () => {
    const escolhidas: PessoaAcademia[] = [];
    fixture.componentInstance.escolher.subscribe(p => escolhidas.push(p));

    fixture.nativeElement.querySelector('button.pessoa').click();

    expect(escolhidas).toEqual([bia]);
  });

  it('desabilita as linhas enquanto salva', () => {
    fixture.componentRef.setInput('salvando', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button.pessoa').disabled).toBeTrue();
  });
});
