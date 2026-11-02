import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LayoutAppComponent } from '../../shared/ui/layout-app/layout-app.component';

interface Plano {
  nome: string;
  valor: string;
  validade: string;
  proximoPagamento: string;
  status: 'ativo' | 'vencendo';
}

@Component({
  selector: 'app-financeiro',
  imports: [CommonModule, LayoutAppComponent],
  templateUrl: './financeiro.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './financeiro.component.scss'
})
export class FinanceiroComponent {
  temPlano = true;

  planoAtivo: Plano = {
    nome: 'Plano Premium',
    valor: 'R$ 149,90',
    validade: '12 meses',
    proximoPagamento: '25/09/2026',
    status: 'ativo'
  };

  upgrades = [
    { nome: 'Plano Plus', valor: 'R$ 189,90', destaque: true },
    { nome: 'Plano Elite', valor: 'R$ 239,90', destaque: false },
    { nome: 'Plano Black', valor: 'R$ 329,90', destaque: false }
  ];

  fecharPlanoMensagem = 'Você ainda não possui um plano ativo. Feche seu plano para começar a treinar com a estrutura completa.';
}
