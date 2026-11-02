import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { SweetAlertNotificador } from './sweet-alert-notificador';

describe('SweetAlertNotificador', () => {
  it('mostra o detail do erro da API com ícone de erro', async () => {
    const fire = spyOn(Swal, 'fire').and.resolveTo({} as never);
    const erro = new HttpErrorResponse({ status: 422, error: { detail: 'Senha atual incorreta.' } });

    await new SweetAlertNotificador().erroDaApi(erro);

    expect(fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'error', text: 'Senha atual incorreta.' }));
  });
});
