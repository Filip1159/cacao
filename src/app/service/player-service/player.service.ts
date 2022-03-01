import { Injectable } from '@angular/core';
import { Card } from "../../model/Card";
import {Rank} from "../../model/Rank";

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  cards: Card[]

  constructor() {
    this.cards = [];
    for (let i=0; i<5; i++) {
      let rankValue = Math.floor(Math.random() * 13 + 2);
      let suit = Math.floor(Math.random() * 4);
      this.cards[i] = {
        rank: new Rank(rankValue),
        suit
      }
    }
  }

}
