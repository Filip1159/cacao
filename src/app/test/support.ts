import { Injectable } from "@angular/core";
import { CardService } from "../service/card.service";
import { Card } from "../model/Card";
import { Rank } from "../model/Rank";
import { Suit } from "../model/Suit";

export const card = (rank: number, suit: Suit): Card => ({
	rank: new Rank(rank),
	suit,
});

@Injectable()
export class MockCardService extends CardService {
	// deterministic (unshuffled) deck
	protected override init(): void {
		this.deck = CardService.createFullDeck();
		this.discardPile = [this.pickBasicCardFromTop()];
	}

	getDeck(): Card[] {
		return this.deck;
	}

	setDeck(cards: Card[]): void {
		this.deck = cards;
	}

	getDiscardPile(): Card[] {
		return this.discardPile;
	}

	setDiscardPile(cards: Card[]): void {
		this.discardPile = cards;
	}
}
