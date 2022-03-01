import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CardComponent } from './components/cards/card/card.component';
import { CardFaceDownComponent } from './components/cards/card-face-down/card-face-down.component';
import { PlayerComponent } from './components/players/player/player.component';
import { CardStackComponent } from './components/card-stack/card-stack.component';
import { OpponentComponent } from './components/players/opponent/opponent.component';

@NgModule({
  declarations: [
    AppComponent,
    CardComponent,
    CardFaceDownComponent,
    PlayerComponent,
    CardStackComponent,
    OpponentComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
