import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AgendaService } from '../../shared/agenda/agenda.service';
import { provedoresApp } from '../testes-app';
import { AgendaComponent } from './agenda.component';

describe('AgendaComponent', () => {
  async function montar() {
    const service = jasmine.createSpyObj<AgendaService>('AgendaService', ['grade', 'excecoes']);
    service.grade.and.returnValue(of([]));
    service.excecoes.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [AgendaComponent],
      providers: [...provedoresApp(), { provide: AgendaService, useValue: service }]
    });
    const fixture = TestBed.createComponent(AgendaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('mostra as abas Grade semanal e Exceções, com a grade por padrão', async () => {
    const fixture = await montar();
    const tela: HTMLElement = fixture.nativeElement;

    const abas = Array.from(tela.querySelectorAll('ion-segment-button')).map(a => a.textContent?.trim());
    expect(abas).toEqual(['Grade semanal', 'Exceções']);
    expect(tela.querySelector('app-grade-semanal')).not.toBeNull();
  });

  it('a aba Exceções mostra a lista de exceções no lugar da grade', async () => {
    const fixture = await montar();

    fixture.componentInstance.mudarAba('excecoes');
    fixture.detectChanges();
    await fixture.whenStable();

    const tela: HTMLElement = fixture.nativeElement;
    expect(tela.querySelector('app-grade-semanal')).toBeNull();
    expect(tela.querySelector('app-excecoes')).not.toBeNull();
  });
});
