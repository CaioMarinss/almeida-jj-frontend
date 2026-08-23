import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertaService {
  success(message: string): Promise<void> {
    return this.show('success', message);
  }

  error(message: string): Promise<void> {
    return this.show('error', message);
  }

  warning(message: string): Promise<void> {
    return this.show('warning', message);
  }

  private async show(
    icon: 'success' | 'error' | 'warning',
    message: string
  ): Promise<void> {
    await Swal.fire({
      icon,
      text: message,
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
