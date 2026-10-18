import { Injectable } from "@angular/core";
import { Turn } from "../model/enum/Turn";
import { Player } from "./player/Player";
import { Card } from "../model/Card";
import { RankCharacter } from "../model/Rank";
import { State } from "../model/enum/State";
import { CardService } from "./card.service";
import { BotPlayer } from "./player/BotPlayer";
import { HumanPlayer } from "./player/HumanPlayer";
import { BehaviorSubject, timer } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class GameService {
	turn: BehaviorSubject<Turn>;
	players: Player[];
	cardCalled: number | null = null;
	cardsToPick: number = 0;

	constructor(public cardService: CardService) {
		this.turn = new BehaviorSubject<Turn>(Turn.ME);
		this.players = [
			new HumanPlayer(this, this.cardService),
			new BotPlayer(this, this.cardService),
		];
		cardService.dealCards(this.players);
	}

	afterCardPlayed(card: Card | null, cardCalled?: number): void {
		console.log(`[${Turn[this.turn.value]}] afterCardPlayed`);
		if (card !== null)
			console.log(
				`[${Turn[this.turn.value]}] played ${JSON.stringify(card)}`,
			);
		else console.log(`[${Turn[this.turn.value]}] picked card`);
		if (card !== null) this.cardService.putCardOnDiscardPile(card);
		this.switchTurn();
		this.resetState();
		if (card !== null) this.switchState(card, cardCalled);
		if (this.turn.value === Turn.OPPONENT) {
			timer(1000).subscribe(() =>
				this.players[Turn.OPPONENT].makeAction(),
			);
		}
		console.log(`[${Turn[this.turn.value]}] after afterCardPlayed`);
	}

	isLegalMove(card: Card): boolean {
		if (this.players[this.turn.value].state === State.CARD_PICKING)
			return false;
		if (
			this.players[this.turn.value].state === State.CARD_CALLED &&
			this.cardCalled !== card.rank.value
		)
			return false;
		if (this.players[this.turn.value].state === State.MISSING) return false;
		return (
			card.rank === this.cardService.discardPileTop.rank ||
			card.suit === this.cardService.discardPileTop.suit
		);
	}

	switchState(card: Card, cardCalled?: number): void {
		switch (card.rank.value) {
			case 2:
				this.players[this.turn.value].state = State.CARD_PICKING;
				this.cardsToPick = 2;
				break;
			case 3:
				this.players[this.turn.value].state = State.CARD_PICKING;
				this.cardsToPick = 3;
				break;
			case 4:
				this.players[this.turn.value].state = State.MISSING;
				break;
			case RankCharacter.Jack:
				this.players[this.turn.value].state = State.CARD_CALLED;
				this.cardCalled = cardCalled!;
				break;
			case RankCharacter.King:
				this.players[this.turn.value].state = State.CARD_PICKING;
				this.cardsToPick = 5;
				break;
		}
	}

	switchTurn(): void {
		this.turn.next(this.turn.value === Turn.ME ? Turn.OPPONENT : Turn.ME);
	}

	private resetState(): void {
		this.players[this.turn.value].state = State.WAITING_FOR_CARD;
		this.cardsToPick = 0;
		this.cardCalled = null;
	}
}
