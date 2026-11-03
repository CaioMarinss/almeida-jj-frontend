import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import {
  IonApp,
  IonInput,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  provideIonicAngular,
  ToastController
} from '@ionic/angular';

@Component({ template: '<p class="aba-a">Aba A</p>' })
class AbaAComponent {}

@Component({ template: '<p class="aba-b">Aba B</p>' })
class AbaBComponent {}

@Component({
  imports: [IonTabs, IonTabBar, IonTabButton, IonLabel],
  template: `<ion-tabs>
    <ion-tab-bar slot="bottom">
      <ion-tab-button tab="a"><ion-label>A</ion-label></ion-tab-button>
      <ion-tab-button tab="b"><ion-label>B</ion-label></ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>`
})
class AbasComponent {}

@Component({
  imports: [IonApp, IonRouterOutlet],
  template: '<ion-app><ion-router-outlet /></ion-app>'
})
class RaizComponent {}

@Component({
  imports: [IonInput, ReactiveFormsModule],
  template: '<ion-input [formControl]="controle" />'
})
class CampoHospedeiroComponent {
  readonly controle = new FormControl('');
}

describe('Ionic sem zone.js', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        provideRouter([
          {
            path: 't',
            component: AbasComponent,
            children: [
              { path: 'a', component: AbaAComponent },
              { path: 'b', component: AbaBComponent }
            ]
          }
        ])
      ]
    });
  });

  it('abas navegam entre rotas', async () => {
    const fixture = TestBed.createComponent(RaizComponent);
    fixture.detectChanges();

    await TestBed.inject(Router).navigateByUrl('/t/b');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.aba-b')).toBeTruthy();
  });

  it('ion-input propaga o valor para o FormControl', async () => {
    const fixture = TestBed.createComponent(CampoHospedeiroComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLElement = fixture.nativeElement.querySelector('ion-input');

    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'abc' }, bubbles: true }));
    (input as unknown as { value: string }).value = 'abc';
    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'abc' }, bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.controle.value).toBe('abc');
  });

  it('ToastController apresenta um toast', async () => {
    const toast = await TestBed.inject(ToastController).create({ message: 'oi', duration: 10 });

    await toast.present();

    expect(document.querySelector('ion-toast')).toBeTruthy();
    await toast.dismiss();
  });
});
