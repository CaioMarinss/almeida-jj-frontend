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

  errorFromApi(error: unknown, fallback = 'Algo deu errado!'): Promise<void> {
    return this.error(this.getApiMessage(error, fallback));
  }

  warning(message: string): Promise<void> {
    return this.show('warning', message);
  }

  private getApiMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const response = (error as { error?: unknown }).error;

    if (typeof response === 'string' && response.trim()) {
      return response;
    }

    if (response && typeof response === 'object') {
      const responseObject = response as Record<string, unknown>;
      const message = responseObject['erro'];

      if (typeof message === 'string' && message.trim()) {
        return message;
      }

      const firstMessage = Object.values(responseObject).find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      );

      if (firstMessage) {
        return firstMessage;
      }
    }

    return fallback;
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
