import {
	Injectable,
	InjectionToken,
	computed,
	inject,
	isDevMode,
	signal,
} from "@angular/core";
import { Subscription, timer } from "rxjs";
import { Card } from "../model/Card";
import { Difficulty } from "../model/enum/Difficulty";
import { Turn } from "../model/enum/Turn";
import { playBotTurn } from "./bot";
import { Shuffle, shuffle } from "../model/deck";
import {
	Call,
	GameState,
	MACAU_PENALTY,
	callMacau,
	endChain,
	hasCounter,
	isLegalMove,
	missTurn,
	newGame,
	pickCards,
	playCard,
	punishMissingMacau,
	topOf,
} from "./rules";

/** How cards are shuffled; replaced in tests to get a predictable deck. */
export const SHUFFLE = new InjectionToken<Shuffle>("SHUFFLE", {
	factory: () => shuffle,
});

const BOT_DELAY_MS = 1000;
/** Gives the human time to say "Macau" before the bot moves. */
const BOT_DELAY_MACAU_MS = 2500;

/**
 * Holds the current game state as a signal and runs it through the rules.
 * Everything the views need is a signal, so they refresh on their own.
 */
@Injectable({
	providedIn: "root",
})
export class GameService {
	private readonly shuffle = inject(SHUFFLE);
	private readonly _state = signal<GameState>(newGame(this.shuffle));
	private botTimer?: Subscription;

	readonly state = this._state.asReadonly();
	readonly difficulty = signal<Difficulty>(Difficulty.NORMAL);
	/** One-off message for the human, e.g. about a Macau penalty. */
	readonly notice = signal<string | null>(null);
	/** Who put the card on top of the discard pile last; the views animate it from that player's hand. */
	readonly lastPlayer = signal<Turn | null>(null);

	readonly top = computed(() => topOf(this._state()));
	readonly deckSize = computed(() => this._state().deck.length);
	readonly humanHand = computed(() => this._state().hands[Turn.ME]);
	readonly opponentHand = computed(() => this._state().hands[Turn.OPPONENT]);
	readonly winner = computed(() => this._state().winner);
	readonly macauPending = computed(() => this._state().macauPending);
	readonly isMyTurn = computed(
		() => this.winner() === null && this._state().turn === Turn.ME,
	);
	readonly isOpponentsTurn = computed(
		() => this.winner() === null && this._state().turn === Turn.OPPONENT,
	);
	readonly isChaining = computed(
		() => this.isMyTurn() && this._state().chain.length > 0,
	);
	readonly canHumanPick = computed(
		() =>
			this.isMyTurn() &&
			this._state().chain.length === 0 &&
			this._state().obligation.kind !== "miss",
	);
	readonly canMiss = computed(
		() =>
			this.isMyTurn() &&
			this._state().chain.length === 0 &&
			this._state().obligation.kind === "miss",
	);

	constructor() {
		if (isDevMode()) (globalThis as any).macauGame = this;
	}

	// --- what the views ask ---

	isLegalMove(card: Card): boolean {
		return isLegalMove(this._state(), card);
	}

	/** Whether the player whose turn it is has a card to play. */
	hasCounter(): boolean {
		return hasCounter(this._state());
	}

	// --- human moves ---

	/** Plays the card at `index` of the human's hand; `call` is the rank or suit asked for by a Jack or Ace. */
	play(index: number, call?: Call): void {
		if (!this.isMyTurn()) return;
		this.commit(playCard(this._state(), index, call));
	}

	/** Draws the pending penalty cards, or a single card, and ends the turn. */
	pick(): void {
		if (!this.canHumanPick()) return;
		this.commit(pickCards(this._state(), this.shuffle));
	}

	/** Serves a turn to miss. */
	miss(): void {
		if (!this.canMiss()) return;
		this.commit(missTurn(this._state()));
	}

	/** Ends the turn after the cards played so far. */
	endTurn(): void {
		if (!this.isChaining()) return;
		this.commit(endChain(this._state()));
	}

	callMacau(): void {
		this.commit(callMacau(this._state()));
	}

	// --- game flow ---

	restart(): void {
		this.botTimer?.unsubscribe();
		this.notice.set(null);
		this.lastPlayer.set(null);
		this._state.set(newGame(this.shuffle));
	}

	/** Replaces parts of the state; a hook for tests that need a specific situation. */
	patch(changes: Partial<GameState>): void {
		this._state.update((state) => ({ ...state, ...changes }));
	}

	private commit(next: GameState): void {
		const previous = this._state();
		if (next === previous) return;
		if (previous.turn === Turn.ME && next.turn !== Turn.ME)
			this.notice.set(null);
		if (topOf(next) !== topOf(previous)) this.lastPlayer.set(previous.turn);
		this._state.set(next);
		if (
			next.winner === null &&
			next.turn === Turn.OPPONENT &&
			previous.turn !== Turn.OPPONENT
		)
			this.scheduleBotMove();
	}

	private scheduleBotMove(): void {
		const delay = this._state().macauPending
			? BOT_DELAY_MACAU_MS
			: BOT_DELAY_MS;
		this.botTimer = timer(delay).subscribe(() => this.botMoves());
	}

	private botMoves(): void {
		let state = this._state();
		if (state.macauPending) {
			state = punishMissingMacau(state, this.shuffle);
			this.notice.set(
				`You forgot to say Macau – you picked ${MACAU_PENALTY} cards.`,
			);
		}
		this.commit(playBotTurn(state, this.difficulty(), this.shuffle));
	}
}
