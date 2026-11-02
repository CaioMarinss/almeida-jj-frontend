import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PerfilService } from './perfil.service';

describe('PerfilService', () => {
  it('troca a senha com PUT em /alunos/me/senha', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);

    TestBed.inject(PerfilService).alterarSenha('Antiga@1', 'Nova@12').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/alunos/me/senha`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ senhaAtual: 'Antiga@1', novaSenha: 'Nova@12' });
    req.flush(null);
    http.verify();
  });
});
