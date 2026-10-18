import { Injectable, signal } from "@angular/core";
import { Turn } from "../model/enum/Turn";
import { Player } from "./player/Player";
import { Card, penaltyOf } from "../model/Card";
import { RankCharacter } from "../model/Rank";
import { Suit } from "../model/Suit";
import { State } from "../model/enum/State";
import { CardService } from "./card.service";
import { BotPlayer } from "./player/BotPlayer";
import { HumanPlayer } from "./player/HumanPlayer";
import { BehaviorSubject, Subscription, timer } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class GameService {
	turn: BehaviorSubject<Turn>;
	players: Player[];
	cardCalled: number | null = null;
	suitCalled: Suit | null = null;
	cardsToPick: number = 0;
	winner = signal<Turn | null>(null);
	private botTimer?: Subscription;

	constructor(public cardService: CardService) {
		this.turn = new BehaviorSubject<Turn>(Turn.ME);
		this.players = [
			new HumanPlayer(this, this.cardService),
			new BotPlayer(this, this.cardService),
		];
		cardService.dealCards(this.players);
	}

	afterCardPlayed(
		card: Card | null,
		cardCalled?: number,
		suitCalled?: Suit,
	): void {
		if (this.winner() !== null) return;
		console.log(`[${Turn[this.turn.value]}] afterCardPlayed`);
		if (card !== null)
			console.log(
				`[${Turn[this.turn.value]}] played ${JSON.stringify(card)}`,
			);
		else console.log(`[${Turn[this.turn.value]}] picked card`);
		if (card !== null) this.cardService.putCardOnDiscardPile(card);
		if (this.players[this.turn.value].cards.length === 0) {
			this.winner.set(this.turn.value);
			// re-emit so the table views refresh with the final card
			this.turn.next(this.turn.value);
			return;
		}
		const pending =
			card !== null &&
			this.players[this.turn.value].state === State.CARD_PICKING
				? this.cardsToPick
				: 0;
		this.switchTurn();
		this.resetState();
		if (card !== null) this.switchState(card, cardCalled, suitCalled);
		this.cardsToPick += pending;
		if (this.turn.value === Turn.OPPONENT) {
			this.botTimer = timer(1000).subscribe(() =>
				this.players[Turn.OPPONENT].makeAction(),
			);
		}
		console.log(`[${Turn[this.turn.value]}] after afterCardPlayed`);
	}

	restart(): void {
		this.botTimer?.unsubscribe();
		this.cardService.reset();
		this.players.forEach((player) => player.reset());
		this.cardsToPick = 0;
		this.cardCalled = null;
		this.suitCalled = null;
		this.winner.set(null);
		this.turn.next(Turn.ME);
		this.cardService.dealCards(this.players);
	}

	isLegalMove(card: Card): boolean {
		if (this.winner() !== null) return false;
		if (this.players[this.turn.value].state === State.CARD_PICKING)
			// a penalty card of the same rank passes (and adds to) the penalty
			return (
				penaltyOf(card) > 0 &&
				card.rank.value === this.cardService.discardPileTop.rank.value
			);
		if (this.players[this.turn.value].state === State.CARD_CALLED)
			return this.cardCalled === card.rank.value;
		if (this.players[this.turn.value].state === State.SUIT_CALLED)
			return this.suitCalled === card.suit;
		if (this.players[this.turn.value].state === State.MISSING) return false;
		return (
			card.rank.value === this.cardService.discardPileTop.rank.value ||
			card.suit === this.cardService.discardPileTop.suit
		);
	}

	switchState(card: Card, cardCalled?: number, suitCalled?: Suit): void {
		const penalty = penaltyOf(card);
		if (penalty > 0) {
			this.players[this.turn.value].state = State.CARD_PICKING;
			this.cardsToPick = penalty;
			return;
		}
		switch (card.rank.value) {
			case 4:
				this.players[this.turn.value].state = State.MISSING;
				break;
			case RankCharacter.Jack:
				this.players[this.turn.value].state = State.CARD_CALLED;
				this.cardCalled = cardCalled!;
				break;
			case RankCharacter.Ace:
				this.players[this.turn.value].state = State.SUIT_CALLED;
				this.suitCalled = suitCalled!;
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
		this.suitCalled = null;
	}
}
