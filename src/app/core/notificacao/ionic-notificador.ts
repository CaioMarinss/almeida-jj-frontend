import { inject, Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { mensagemDeErro } from '../http/erro-api';
import { Notificador } from './notificador';

@Injectable()
export class IonicNotificador extends Notificador {
  private readonly toasts = inject(ToastController);
  private readonly alertas = inject(AlertController);
  private confirmando = false;

  sucesso(mensagem: string): Promise<void> {
    return this.toast(mensagem, 'success');
  }

  aviso(mensagem: string): Promise<void> {
    return this.toast(mensagem, 'warning');
  }

  async erro(mensagem: string): Promise<void> {
    const alerta = await this.alertas.create({ header: 'Ops', message: mensagem, buttons: ['OK'] });
    await alerta.present();
    await alerta.onDidDismiss();
  }

  erroDaApi(erro: unknown, padrao?: string): Promise<void> {
    return this.erro(mensagemDeErro(erro, padrao));
  }

  async confirmar(titulo: string, mensagem: string, confirmar = 'Confirmar'): Promise<boolean> {
    if (this.confirmando) {
      return false;
    }
    this.confirmando = true;
    try {
      const alerta = await this.alertas.create({
        header: titulo,
        message: mensagem,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: confirmar, role: 'confirm' }
        ]
      });
      await alerta.present();
      const { role } = await alerta.onDidDismiss();
      return role === 'confirm';
    } finally {
      this.confirmando = false;
    }
  }

  private async toast(mensagem: string, color: 'success' | 'warning'): Promise<void> {
    const toast = await this.toasts.create({ message: mensagem, color, duration: 3000, position: 'top' });
    await toast.present();
  }
}
