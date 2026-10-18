import { Card } from "../../model/Card";
import { State } from "../../model/enum/State";
import { GameService } from "../game.service";
import { CardService } from "../card.service";
import { Turn } from "../../model/enum/Turn";

export abstract class Player {
	cards: Card[];
	state: State;
	chosenMove: number;
	chosenRank?: number;

	protected constructor(
		protected gameService: GameService,
		protected cardService: CardService,
	) {
		this.cards = [];
		this.state = State.WAITING_FOR_CARD;
		this.chosenMove = -1;
	}

	addCard(card: Card): void {
		this.cards.push(card);
	}

	drawCard(): void {
		const card = this.cardService.pickCardFromTop();
		if (card) this.addCard(card);
	}

	removeCard(cardIndex: number): Card {
		return this.cards.splice(cardIndex, 1)[0];
	}

	makeAction() {
		console.log(`[${Turn[this.gameService.turn.value]}] makeAction`);
		if (this.state === State.WAITING_FOR_CARD) {
			this.playCard();
		} else if (this.state === State.MISSING) {
			this.gameService.afterCardPlayed(null);
		} else if (this.state === State.CARD_PICKING) {
			for (let i = 0; i < this.gameService.cardsToPick; i++)
				this.drawCard();
			this.gameService.cardsToPick = 0;
			this.gameService.afterCardPlayed(null);
		} else if (this.state === State.CARD_CALLED) {
			this.playCard();
		}
		console.log(
			`[${Turn[this.gameService.turn.value]}] are my cards disabled? ${this.gameService.players[0].state === State.MISSING} || ${this.gameService.turn.value !== Turn.ME}`,
		);
		console.log(`[${Turn[this.gameService.turn.value]}] after makeAction`);
	}

	abstract playCard(cardIndex?: number): void;
}
