import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';
import { mensagemDeErro } from '../http/erro-api';
import { Notificador } from './notificador';

@Injectable()
export class SweetAlertNotificador extends Notificador {
  sucesso(mensagem: string): Promise<void> {
    return this.mostrar('success', mensagem);
  }

  erro(mensagem: string): Promise<void> {
    return this.mostrar('error', mensagem);
  }

  aviso(mensagem: string): Promise<void> {
    return this.mostrar('warning', mensagem);
  }

  erroDaApi(erro: unknown, padrao?: string): Promise<void> {
    return this.erro(mensagemDeErro(erro, padrao));
  }

  private async mostrar(icon: SweetAlertIcon, text: string): Promise<void> {
    await Swal.fire({
      icon,
      text,
      heightAuto: false,
      scrollbarPadding: false,
      customClass: {
        popup: 'app-alert-popup',
        title: 'app-alert-title',
        htmlContainer: 'app-alert-message',
        confirmButton: 'app-alert-confirm'
      },
      buttonsStyling: false
    });
  }
}
