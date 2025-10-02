import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import 'zone.js';  // 👈 agrega esto al inicio

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
