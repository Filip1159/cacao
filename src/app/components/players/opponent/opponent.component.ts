import {Component, OnInit} from '@angular/core';
import {Card} from "../../../model/Card";
import {Rank, RankCharacter} from "../../../model/Rank";
import {Suit} from "../../../model/Suit";

@Component({
  selector: 'app-opponent',
  templateUrl: './opponent.component.html',
  styleUrls: ['./opponent.component.scss']
})
export class OpponentComponent implements OnInit {
  cards: Card[]

  constructor() {
    this.cards = []
    this.cards[0] = {
      rank: new Rank(3),
      suit: Suit.SPADES
    }
    this.cards[1] = {
      rank: new Rank(7),
      suit: Suit.DIAMS
    }
    this.cards[2] = {
      rank: new Rank(RankCharacter.King),
      suit: Suit.HEARTS
    }
    this.cards[3] = {
      rank: new Rank(RankCharacter.Ace),
      suit: Suit.CLUBS
    }
    this.cards[4] = {
      rank: new Rank(6),
      suit: Suit.CLUBS
    }
  }

  ngOnInit(): void {
  }

}
