import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import HpoInputFormComponent from './hpo-input-form/hpo-input-form';
import { HraExample } from "./hra-example/hra-example";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HpoInputFormComponent, HraExample],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('hpo2hra');
}
