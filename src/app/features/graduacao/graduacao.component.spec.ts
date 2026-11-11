import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ContadoresDonoService } from '../../core/dono/contadores-dono.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Apto, Faixa, ListaAptos } from '../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../shared/graduacao/graduacao.service';
import { criarNotificador } from '../auth/testes-auth';
import { provedoresApp } from '../testes-app';
import { GraduacaoComponent } from './graduacao.component';

const BRANCA: Faixa = { id: 1, codigo: 'B', descricao: 'Branca', categoria: 'ADULTO', corPrincipal: '#fff', corSecundaria: null, grauMin: 0, grauMax: 4 };

function apto(id: number, nome: string): Apto {
  return { id, nome, atual: { faixa: BRANCA, grau: 1 }, contadas: 34, minimo: 30, apto: true, sugestao: null, exame: null, graduado: false };
}

const LISTA: ListaAptos = {
  evento: { data: '2026-12-14', minimoGrau: 30, minimoFaixa: 60 },
  grau: [apto(2, 'Bia')],
  faixa: []
};

describe('GraduacaoComponent', () => {
  let service: jasmine.SpyObj<GraduacaoService>;
  let contadores: jasmine.SpyObj<ContadoresDonoService>;
  let fixture: ComponentFixture<GraduacaoComponent>;

  const el = (): HTMLElement => fixture.nativeElement;
  const botao = (rotulo: string): HTMLElement | undefined =>
    Array.from(el().querySelectorAll<HTMLElement>('ajj-botao')).find((b) => b.textContent?.trim() === rotulo);
  const clicar = (rotulo: string): void => {
    botao(rotulo)!.querySelector('ion-button')!.click();
    fixture.detectChanges();
  };

  function criar(): void {
    fixture = TestBed.createComponent(GraduacaoComponent);
    fixture.detectChanges();
    fixture.detectChanges();
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-07T15:00:00Z'));
    service = jasmine.createSpyObj<GraduacaoService>('GraduacaoService', ['proxima', 'aptos', 'faixas', 'agendar']);
    service.proxima.and.returnValue(of({ data: '2026-12-14', minimoGrau: 30, minimoFaixa: 60 }));
    service.aptos.and.returnValue(of(LISTA));
    service.faixas.and.returnValue(of([BRANCA]));
    contadores = jasmine.createSpyObj<ContadoresDonoService>('ContadoresDonoService', ['atualizar']);
    contadores.atualizar.and.resolveTo();
    TestBed.configureTestingModule({
      imports: [GraduacaoComponent],
      providers: [
        ...provedoresApp(criarNotificador()),
        { provide: GraduacaoService, useValue: service },
        { provide: ContadoresDonoService, useValue: contadores }
      ]
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('mostra o painel do evento, o resumo e a lista na própria tela', () => {
    criar();

    expect(el().textContent).toContain('Próxima graduação');
    expect(el().textContent).toContain('14/12');
    expect(el().textContent).toContain('1 apto · 0 exames feitos · 0 graduados');
    expect(el().querySelectorAll('li.linha').length).toBe(1);
    expect(el().querySelector('ion-segment')).not.toBeNull();
    expect(botao('Ver aptos')).toBeUndefined();
  });

  it('não mostra mais busca, filtro de faixa nem lista de alunos', () => {
    criar();

    expect(el().querySelector('input[type="search"]')).toBeNull();
    expect(el().querySelector('li.aluno')).toBeNull();
  });

  it('semEventoMostraEstadoVazio e o botão abre o Alterar', () => {
    service.proxima.and.returnValue(of(null));
    service.aptos.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'ERR033' } })));
    criar();

    expect(el().textContent).toContain('Nenhuma graduação agendada');
    expect(el().querySelector('input[type="date"]')).toBeNull();
    const vazio = el().querySelector<HTMLElement>('.vazio')!;
    Array.from(vazio.querySelectorAll<HTMLElement>('ajj-botao')).find((b) => b.textContent?.trim() === 'Alterar')!
      .querySelector('ion-button')!
      .click();
    fixture.detectChanges();

    expect(el().querySelector('input[type="date"]')).not.toBeNull();
  });

  it('alterar a data recarrega os aptos e os contadores', () => {
    service.agendar.and.returnValue(of({ data: '2026-12-20', minimoGrau: 30, minimoFaixa: 60 }));
    criar();
    clicar('Alterar');
    const campo = el().querySelector<HTMLInputElement>('input[type="date"]')!;
    campo.value = '2026-12-20';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(service.aptos).toHaveBeenCalledTimes(2);
    expect(contadores.atualizar).toHaveBeenCalledTimes(1);
  });

  it('ao voltar para a aba recarrega os aptos e a próxima graduação, menos na primeira entrada', () => {
    criar();
    fixture.componentInstance.ionViewWillEnter();
    expect(service.aptos).toHaveBeenCalledTimes(1);
    expect(service.proxima).toHaveBeenCalledTimes(1);

    service.aptos.and.returnValue(of({ ...LISTA, grau: [apto(2, 'Bia'), apto(3, 'Caio')] }));
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();

    expect(service.aptos).toHaveBeenCalledTimes(2);
    expect(service.proxima).toHaveBeenCalledTimes(2);
    expect(el().querySelectorAll('li.linha').length).toBe(2);
  });

  it('ao voltar em outro dia libera o Graduou na data do evento', () => {
    service.aptos.and.returnValue(of({ ...LISTA, grau: [{ ...apto(2, 'Bia'), exame: { aprovado: true, nota: 9, observacao: null } }] }));
    jasmine.clock().mockDate(new Date('2026-12-13T15:00:00Z'));
    criar();
    const ion = (): HTMLElement & { disabled: boolean } => botao('Graduou')!.querySelector<HTMLElement & { disabled: boolean }>('ion-button')!;
    expect(ion().disabled).toBeTrue();

    jasmine.clock().mockDate(new Date('2026-12-14T15:00:00Z'));
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();

    expect(ion().disabled).toBeFalse();
    expect(el().textContent).not.toContain('Disponível em');
  });
});
