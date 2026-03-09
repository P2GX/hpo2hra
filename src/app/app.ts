import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import HpoInputFormComponent from './hpo-input-form/hpo-input-form';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HpoInputFormComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('hpo2hra');
}
