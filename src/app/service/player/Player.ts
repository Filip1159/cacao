import { Suit } from "../../model/Suit";
import { Card } from "../../model/Card";
import { State } from "../../model/enum/State";
import { GameService } from "../game.service";
import { CardService } from "../card.service";

export abstract class Player {
	cards: Card[];
	state: State;
	chosenMove: number;
	chosenRank?: number;
	chosenSuit?: Suit;

	protected constructor(
		protected gameService: GameService,
		protected cardService: CardService,
	) {
		this.cards = [];
		this.state = State.WAITING_FOR_CARD;
		this.chosenMove = -1;
	}

	reset(): void {
		this.cards.length = 0;
		this.state = State.WAITING_FOR_CARD;
		this.chosenMove = -1;
		this.chosenRank = undefined;
		this.chosenSuit = undefined;
	}

	addCard(card: Card): void {
		this.cards.push(card);
	}

	drawCard(): void {
		const card = this.cardService.pickCardFromTop();
		if (card) this.addCard(card);
	}

	hasCounter(): boolean {
		return this.cards.some((card) => this.gameService.isLegalMove(card));
	}

	removeCard(cardIndex: number): Card {
		return this.cards.splice(cardIndex, 1)[0];
	}

	/** Does whatever the player's current state asks for: play a card, pick cards or miss the turn. */
	makeAction() {
		switch (this.state) {
			case State.MISSING:
				if (this.hasCounter()) this.playCard();
				else this.gameService.afterCardPlayed(null);
				break;
			case State.CARD_PICKING:
				if (this.hasCounter()) this.playCard();
				else this.gameService.pickCards(this);
				break;
			default:
				this.playCard();
		}
	}

	abstract playCard(cardIndex?: number): void;
}
