import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-popup.component.html',
  styleUrl: './confirm-popup.component.scss'
})
export class ConfirmPopupComponent {
  @Input() visible = false;
  @Input() title = 'Confirmação';
  @Input() message = 'Tem certeza que deseja continuar?';
  @Input() confirmLabel = 'Sim';
  @Input() cancelLabel = 'Não';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  close(): void {
    this.cancel.emit();
  }

  confirmAction(): void {
    this.confirm.emit();
  }
}
