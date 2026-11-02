import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { BotaoComponent } from './botao.component';

describe('BotaoComponent', () => {
  let fixture: ComponentFixture<BotaoComponent>;
  let cliques: number;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [BotaoComponent], providers: [provideIonicAngular()] });
    fixture = TestBed.createComponent(BotaoComponent);
    cliques = 0;
    fixture.componentInstance.clique.subscribe(() => cliques++);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const ionButton = (): HTMLElement => fixture.nativeElement.querySelector('ion-button');

  it('emite clique', () => {
    ionButton().click();

    expect(cliques).toBe(1);
  });

  it('carregando não emite e mostra spinner', async () => {
    fixture.componentRef.setInput('carregando', true);
    fixture.detectChanges();
    await fixture.whenStable();

    ionButton().click();

    expect(cliques).toBe(0);
    expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
    expect(ionButton().getAttribute('aria-busy')).toBe('true');
  });

  it('desabilitado não emite', async () => {
    fixture.componentRef.setInput('desabilitado', true);
    fixture.detectChanges();
    await fixture.whenStable();

    ionButton().click();

    expect(cliques).toBe(0);
  });
});
