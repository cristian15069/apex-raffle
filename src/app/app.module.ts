import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { App } from './app';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    RouterModule.forRoot([]),  
    App
  ],
  bootstrap: []
})
export class AppModule {}
