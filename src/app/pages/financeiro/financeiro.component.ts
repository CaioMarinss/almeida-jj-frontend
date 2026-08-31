import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BasePageComponent } from '../../components/base-page/base-page.component';

interface Plano {
  nome: string;
  valor: string;
  validade: string;
  proximoPagamento: string;
  status: 'ativo' | 'vencendo';
}

@Component({
  selector: 'app-financeiro',
  standalone: true,
  imports: [CommonModule, BasePageComponent],
  templateUrl: './financeiro.component.html',
  styleUrl: './financeiro.component.scss'
})
export class FinanceiroComponent {
  userName = 'Maria Almeida';
  role = 'Aluno';

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
