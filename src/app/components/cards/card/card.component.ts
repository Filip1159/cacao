import {Component, Input, OnInit} from '@angular/core';
import {Rank, RankCharacter} from "../../../model/Rank";
import {Suit} from "../../../model/Suit";
import {Card} from "../../../model/Card";

@Component({
	selector: 'app-card',
	templateUrl: './card.component.html',
	styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {
	@Input() card: Card = {rank: new Rank(2), suit: Suit.HEARTS}

	constructor() {
	}

	ngOnInit(): void {
	}

	rankToString(): string {
		switch (this.card.rank.value) {
			case RankCharacter.Jack:
				return "J"
			case RankCharacter.Queen:
				return "Q"
			case RankCharacter.King:
				return "K"
			case RankCharacter.Ace:
				return "A"
			default:
				return this.card.rank.value.toString()
		}
	}

	suitToString(): string {
		switch (this.card.suit) {
			case Suit.HEARTS:
				return '♥';
			case Suit.DIAMS:
				return '♦';
			case Suit.SPADES:
				return '♠';
			case Suit.CLUBS:
				return '♣';
			default:
				throw new Error("Internal error")
		}
	}

}
