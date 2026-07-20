import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HraExample } from "./hra-example/hra-example";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HraExample],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('hpo2hra');
}
