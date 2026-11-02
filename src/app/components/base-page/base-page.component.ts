import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfirmPopupComponent } from '../confirm-popup/confirm-popup.component';

export interface BasePageNavItem {
  label: string;
  route?: string;
  active?: boolean;
}

@Component({
  selector: 'app-base-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmPopupComponent],
  templateUrl: './base-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './base-page.component.scss'
})
export class BasePageComponent {
  @Input() heading = 'Bem-vindo';
  @Input() title = 'Dashboard';
  @Input() userName = sessionStorage.getItem('username') ?? 'User';
  @Input() role = sessionStorage.getItem('user-is-admin') === 'true' ? 'Admin' : 'Aluno';
  @Input() navItems: BasePageNavItem[] = [
    { label: 'Visão geral', route: '/dashboard', active: true },
    { label: 'Treinos', route: '/calendario' },
    { label: 'Financeiro', route: '/financeiro' },
    { label: 'Configurações', route: '/configuracoes' }
  ];

  showLogoutDialog = false;

  constructor(private router: Router) {}

  openLogoutDialog(): void {
    this.showLogoutDialog = true;
  }

  closeLogoutDialog(): void {
    this.showLogoutDialog = false;
  }

  confirmLogout(): void {
    this.showLogoutDialog = false;
    this.router.navigate(['/login']);
  }
}