import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GraduacaoService } from '../graduacao/graduacao.service';
import { AlunoPainel, PessoaAcademia } from './alunos.model';

@Injectable({ providedIn: 'root' })
export class AlunosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;
  private readonly _painelEmCache = signal<AlunoPainel[] | null>(null);

  readonly painelEmCache = this._painelEmCache.asReadonly();

  constructor() {
    inject(GraduacaoService)
      .atualAlterada$.pipe(takeUntilDestroyed())
      .subscribe(({ idAluno, atual }) => this.alterarEmCache(idAluno, { atual }));
  }

  painel(): Observable<AlunoPainel[]> {
    return this.http.get<AlunoPainel[]>(`${this.base}/alunos/painel`).pipe(tap((lista) => this._painelEmCache.set(lista)));
  }

  listar(): Observable<PessoaAcademia[]> {
    return this.http.get<PessoaAcademia[]>(`${this.base}/alunos`);
  }

  alterarPerfil(id: number, perfil: 'PROFESSOR' | 'ALUNO'): Observable<void> {
    return this.http.put<void>(`${this.base}/alunos/${id}/perfil`, { perfil });
  }

  alterarEmCache(id: number, mudanca: Partial<Pick<AlunoPainel, 'atual' | 'perfil'>>): void {
    this._painelEmCache.update((lista) => lista?.map((a) => (a.id === id ? { ...a, ...mudanca } : a)) ?? null);
  }
}
