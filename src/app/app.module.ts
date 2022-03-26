import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CardComponent } from './components/cards/card/card.component';
import { CardFaceDownComponent } from './components/cards/card-face-down/card-face-down.component';
import { PlayerComponent } from './components/players/player/player.component';
import { DiscardPileComponent } from './components/discard-pile/discard-pile.component';
import { OpponentComponent } from './components/players/opponent/opponent.component';
import { CardCalledModalComponent } from './components/card-called-modal/card-called-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    CardComponent,
    CardFaceDownComponent,
    PlayerComponent,
    DiscardPileComponent,
    OpponentComponent,
    CardCalledModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
