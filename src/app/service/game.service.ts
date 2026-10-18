import { Injectable, signal } from "@angular/core";
import { Turn } from "../model/enum/Turn";
import { Difficulty } from "../model/enum/Difficulty";
import { Player } from "./player/Player";
import { Card, penaltyOf } from "../model/Card";
import { RankCharacter } from "../model/Rank";
import { Suit } from "../model/Suit";
import { State } from "../model/enum/State";
import { CardService } from "./card.service";
import { BotPlayer } from "./player/BotPlayer";
import { HumanPlayer } from "./player/HumanPlayer";
import { BehaviorSubject, Subscription, timer } from "rxjs";

const BOT_DELAY_MS = 1000;
/** Gives the human time to say "Macau" before the bot moves. */
const BOT_DELAY_MACAU_MS = 2500;
const MACAU_PENALTY = 2;

/** What a player had pending before their turn ended and hands over to the next one. */
interface CarriedOver {
	cardsToPick: number;
	turnsToMiss: number;
	pendingMiss: { player: Turn; left: number } | null;
}

@Injectable({
	providedIn: "root",
})
export class GameService {
	turn: BehaviorSubject<Turn>;
	players: Player[];
	cardCalled: number | null = null;
	suitCalled: Suit | null = null;
	cardsToPick: number = 0;
	turnsToMiss: number = 0;
	/** Cards of one rank played this turn, before the turn has been ended. */
	chain: Card[] = [];
	winner = signal<Turn | null>(null);
	difficulty = signal<Difficulty>(Difficulty.NORMAL);
	/** The human has one card left and still has to say "Macau". */
	macauPending = signal(false);
	/** One-off message for the human, e.g. about a Macau penalty. */
	notice = signal<string | null>(null);
	private pendingMiss: { player: Turn; left: number } | null = null;
	private botTimer?: Subscription;

	constructor(public cardService: CardService) {
		this.turn = new BehaviorSubject<Turn>(Turn.ME);
		this.players = [
			new HumanPlayer(this, this.cardService),
			new BotPlayer(this, this.cardService),
		];
		cardService.dealCards(this.players);
	}

	// --- ending a turn ---

	/** The current player played a single card (or picked cards, with null) and the turn ends. */
	afterCardPlayed(
		card: Card | null,
		cardCalled?: number,
		suitCalled?: Suit,
	): void {
		if (this.winner() !== null) return;
		if (card !== null) this.cardService.putCardOnDiscardPile(card);
		this.finishTurn(card === null ? [] : [card], cardCalled, suitCalled);
	}

	/**
	 * Puts a card from the player's hand on the discard pile. Cards of the
	 * same rank can be added until the turn is ended; for the last one the
	 * turn ends automatically.
	 */
	stageCard(
		player: Player,
		index: number,
		cardCalled?: number,
		suitCalled?: Suit,
	): void {
		if (this.winner() !== null) return;
		const card = player.removeCard(index);
		this.cardService.putCardOnDiscardPile(card);
		this.chain.push(card);
		if (!this.canChain(player)) this.endChain(cardCalled, suitCalled);
	}

	/** Whether the player can add another card of the same rank this turn. */
	canChain(player: Player): boolean {
		if (this.chain.length === 0) return false;
		const rank = this.chain[0].rank.value;
		// Jacks and Aces need a call, so they are always played alone
		if (rank === RankCharacter.Jack || rank === RankCharacter.Ace)
			return false;
		return player.cards.some((card) => card.rank.value === rank);
	}

	endChain(cardCalled?: number, suitCalled?: Suit): void {
		const cards = this.chain;
		this.chain = [];
		this.finishTurn(cards, cardCalled, suitCalled);
	}

	private finishTurn(
		cards: Card[],
		cardCalled?: number,
		suitCalled?: Suit,
	): void {
		const current = this.players[this.turn.value];
		if (current.cards.length === 0) {
			this.winner.set(this.turn.value);
			// re-emit so the table views refresh with the final card
			this.turn.next(this.turn.value);
			return;
		}
		if (this.turn.value === Turn.ME) {
			this.notice.set(null);
			this.macauPending.set(
				cards.length > 0 && current.cards.length === 1,
			);
		}
		const carried = this.collectCarriedOver(current, cards);
		this.switchTurn();
		this.resetState();
		this.applyCards(cards, cardCalled, suitCalled);
		this.applyCarriedOver(carried);
		this.scheduleBotMove();
	}

	private collectCarriedOver(current: Player, cards: Card[]): CarriedOver {
		const passesOnMiss =
			cards.some((card) => card.rank.value === 4) &&
			current.state === State.MISSING;
		return {
			// a countered penalty adds up
			cardsToPick:
				cards.length > 0 && current.state === State.CARD_PICKING
					? this.cardsToPick
					: 0,
			turnsToMiss: passesOnMiss ? this.turnsToMiss : 0,
			// a player who still has turns to miss gets them back after the
			// other player has moved
			pendingMiss:
				cards.length === 0 &&
				current.state === State.MISSING &&
				this.turnsToMiss > 1
					? { player: this.turn.value, left: this.turnsToMiss - 1 }
					: null,
		};
	}

	/** Applies the effect of the cards just played to the player whose turn it is now. */
	private applyCards(
		cards: Card[],
		cardCalled?: number,
		suitCalled?: Suit,
	): void {
		if (cards.length === 0) return;
		const next = this.players[this.turn.value];
		const penalty = cards.reduce((sum, card) => sum + penaltyOf(card), 0);
		const fours = cards.filter((card) => card.rank.value === 4).length;
		const last = cards[cards.length - 1];
		if (penalty > 0) {
			next.state = State.CARD_PICKING;
			this.cardsToPick = penalty;
		} else if (fours > 0) {
			next.state = State.MISSING;
			this.turnsToMiss = fours;
		} else if (last.rank.value === RankCharacter.Jack) {
			next.state = State.CARD_CALLED;
			this.cardCalled = cardCalled!;
		} else if (last.rank.value === RankCharacter.Ace) {
			next.state = State.SUIT_CALLED;
			this.suitCalled = suitCalled!;
		}
	}

	private applyCarriedOver(carried: CarriedOver): void {
		const next = this.players[this.turn.value];
		this.cardsToPick += carried.cardsToPick;
		this.turnsToMiss += carried.turnsToMiss;
		if (this.pendingMiss?.player === this.turn.value) {
			if (next.state === State.WAITING_FOR_CARD) {
				next.state = State.MISSING;
				this.turnsToMiss = this.pendingMiss.left;
			}
			this.pendingMiss = null;
		}
		if (carried.pendingMiss) this.pendingMiss = carried.pendingMiss;
	}

	private scheduleBotMove(): void {
		if (this.turn.value !== Turn.OPPONENT) return;
		const delay = this.macauPending() ? BOT_DELAY_MACAU_MS : BOT_DELAY_MS;
		this.botTimer = timer(delay).subscribe(() => {
			this.punishMissingMacau();
			this.players[Turn.OPPONENT].makeAction();
		});
	}

	// --- Macau ---

	callMacau(): void {
		this.macauPending.set(false);
	}

	private punishMissingMacau(): void {
		if (!this.macauPending()) return;
		this.macauPending.set(false);
		const human = this.players[Turn.ME];
		for (let i = 0; i < MACAU_PENALTY; i++) human.drawCard();
		this.notice.set(
			`You forgot to say Macau – you picked ${MACAU_PENALTY} cards.`,
		);
	}

	// --- picking cards ---

	canHumanPick(): boolean {
		return (
			this.winner() === null &&
			this.turn.value === Turn.ME &&
			this.chain.length === 0 &&
			this.players[Turn.ME].state !== State.MISSING
		);
	}

	/** The player draws the pending penalty cards, or a single card, and the turn ends. */
	pickCards(player: Player): void {
		const count =
			player.state === State.CARD_PICKING ? this.cardsToPick : 1;
		for (let i = 0; i < count; i++) player.drawCard();
		this.afterCardPlayed(null);
	}

	humanPicks(): void {
		this.pickCards(this.players[Turn.ME]);
	}

	// --- game flow ---

	restart(): void {
		this.botTimer?.unsubscribe();
		this.cardService.reset();
		this.players.forEach((player) => player.reset());
		this.chain = [];
		this.cardsToPick = 0;
		this.turnsToMiss = 0;
		this.pendingMiss = null;
		this.cardCalled = null;
		this.suitCalled = null;
		this.macauPending.set(false);
		this.notice.set(null);
		this.winner.set(null);
		this.turn.next(Turn.ME);
		this.cardService.dealCards(this.players);
	}

	isLegalMove(card: Card): boolean {
		if (this.winner() !== null) return false;
		if (this.chain.length > 0)
			return card.rank.value === this.chain[0].rank.value;
		const state = this.players[this.turn.value].state;
		const top = this.cardService.discardPileTop;
		switch (state) {
			case State.CARD_PICKING:
				// a penalty card of the same rank passes (and adds to) the penalty
				return (
					penaltyOf(card) > 0 && card.rank.value === top.rank.value
				);
			case State.CARD_CALLED:
				return this.cardCalled === card.rank.value;
			case State.SUIT_CALLED:
				return this.suitCalled === card.suit;
			case State.MISSING:
				// a 4 passes the miss on to the other player
				return card.rank.value === 4 && top.rank.value === 4;
			default:
				return (
					card.rank.value === top.rank.value || card.suit === top.suit
				);
		}
	}

	switchTurn(): void {
		this.turn.next(this.turn.value === Turn.ME ? Turn.OPPONENT : Turn.ME);
	}

	private resetState(): void {
		this.players[this.turn.value].state = State.WAITING_FOR_CARD;
		this.cardsToPick = 0;
		this.turnsToMiss = 0;
		this.cardCalled = null;
		this.suitCalled = null;
	}
}
