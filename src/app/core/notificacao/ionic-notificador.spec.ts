import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AlertController, ToastController } from '@ionic/angular';
import { IonicNotificador } from './ionic-notificador';

describe('IonicNotificador', () => {
  let toasts: jasmine.SpyObj<ToastController>;
  let alertas: jasmine.SpyObj<AlertController>;
  let notificador: IonicNotificador;
  let fecharAlerta: (role?: string) => void;

  beforeEach(() => {
    toasts = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    alertas = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    toasts.create.and.resolveTo({ present: () => Promise.resolve() } as HTMLIonToastElement);
    alertas.create.and.callFake(async () => {
      let resolver: (valor: { role?: string }) => void = () => undefined;
      const fechado = new Promise<{ role?: string }>(r => (resolver = r));
      fecharAlerta = role => resolver({ role });
      return { present: () => Promise.resolve(), onDidDismiss: () => fechado } as unknown as HTMLIonAlertElement;
    });
    TestBed.configureTestingModule({
      providers: [
        IonicNotificador,
        { provide: ToastController, useValue: toasts },
        { provide: AlertController, useValue: alertas }
      ]
    });
    notificador = TestBed.inject(IonicNotificador);
  });

  it('sucesso usa toast de sucesso', async () => {
    await notificador.sucesso('Feito!');

    expect(toasts.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'Feito!', color: 'success' }));
  });

  it('erroDaApi mostra o detail num alerta', async () => {
    const pendente = notificador.erroDaApi(new HttpErrorResponse({ status: 422, error: { detail: 'Senha atual incorreta.' } }));
    await Promise.resolve();
    await Promise.resolve();
    fecharAlerta();
    await pendente;

    expect(alertas.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'Senha atual incorreta.' }));
  });

  it('confirmar resolve true ao confirmar', async () => {
    const resposta = notificador.confirmar('Sair', 'Deseja sair?', 'Sair');
    await Promise.resolve();
    await Promise.resolve();
    fecharAlerta('confirm');

    expect(await resposta).toBeTrue();
  });

  it('confirmar resolve false ao cancelar', async () => {
    const resposta = notificador.confirmar('Sair', 'Deseja sair?');
    await Promise.resolve();
    await Promise.resolve();
    fecharAlerta('cancel');

    expect(await resposta).toBeFalse();
  });

  it('segundo confirmar enquanto o primeiro está aberto não abre outro', async () => {
    const primeiro = notificador.confirmar('Sair', 'Deseja sair?');
    const segundo = notificador.confirmar('Sair', 'Deseja sair?');

    expect(await segundo).toBeFalse();
    await Promise.resolve();
    await Promise.resolve();
    fecharAlerta('confirm');
    expect(await primeiro).toBeTrue();
    expect(alertas.create).toHaveBeenCalledTimes(1);
  });
});
