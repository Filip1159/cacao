import { Player } from "./Player";
import { GameService } from "../game.service";
import { CardService } from "../card.service";
import { Card, penaltyOf } from "../../model/Card";
import { Difficulty } from "../../model/enum/Difficulty";
import { Turn } from "../../model/enum/Turn";
import { RankCharacter } from "../../model/Rank";
import { Suit, getAllSuits } from "../../model/Suit";

/** The human has this many cards or fewer: attack cards become the top priority. */
const ATTACK_THRESHOLD: Record<Difficulty, number> = {
	[Difficulty.EASY]: 0,
	[Difficulty.NORMAL]: 3,
	[Difficulty.HARD]: Infinity,
};

export class BotPlayer extends Player {
	constructor(gameService: GameService, cardService: CardService) {
		super(gameService, cardService);
	}

	/**
	 * Picks the card to play, -1 if there is none.
	 *
	 * Easy plays the first legal card. Otherwise the legal card with the best
	 * score wins, the earliest one on a tie: plain cards go first, Jacks and
	 * Aces are saved for later and attack cards (penalties and 4s) are held
	 * back until the human is close to winning. Hard attacks right away.
	 */
	getBestMove(): number {
		const difficulty = this.gameService.difficulty();
		if (difficulty === Difficulty.EASY)
			return this.cards.findIndex((card) =>
				this.gameService.isLegalMove(card),
			);
		const humanHandSize = this.gameService.players[Turn.ME].cards.length;
		const attack = humanHandSize <= ATTACK_THRESHOLD[difficulty];
		let best = -1;
		let bestScore = -Infinity;
		this.cards.forEach((card, index) => {
			if (!this.gameService.isLegalMove(card)) return;
			const score = BotPlayer.score(card, attack);
			if (score > bestScore) {
				best = index;
				bestScore = score;
			}
		});
		return best;
	}

	private static score(card: Card, attack: boolean): number {
		if (card.rank.value === RankCharacter.Jack) return 5;
		if (card.rank.value === RankCharacter.Ace) return 4;
		if (penaltyOf(card) > 0 || card.rank.value === 4)
			return attack ? 20 : 8;
		return 10;
	}

	/** The rank (5-10) it holds most of; a random one on Easy or without any. */
	chooseRankToCall(hand: Card[] = this.cards): number {
		const counts = new Map<number, number>();
		for (const card of hand) {
			const value = card.rank.value;
			if (value >= 5 && value <= 10)
				counts.set(value, (counts.get(value) ?? 0) + 1);
		}
		if (counts.size === 0 || this.isEasy())
			return 5 + Math.floor(Math.random() * 6);
		return BotPlayer.mostCommon(counts);
	}

	/** The suit it holds most of; a random one on Easy or without any. */
	chooseSuitToCall(hand: Card[] = this.cards): Suit {
		const counts = new Map<Suit, number>();
		for (const card of hand)
			counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
		if (counts.size === 0 || this.isEasy()) {
			const suits = getAllSuits();
			return suits[Math.floor(Math.random() * suits.length)];
		}
		return BotPlayer.mostCommon(counts);
	}

	override playCard() {
		const move = this.getBestMove();
		if (move === -1) {
			this.gameService.pickCards(this);
			return;
		}
		const rank = this.cards[move].rank.value;
		const rest = this.cards.filter((_, index) => index !== move);
		this.gameService.stageCard(
			this,
			move,
			rank === RankCharacter.Jack
				? this.chooseRankToCall(rest)
				: undefined,
			rank === RankCharacter.Ace
				? this.chooseSuitToCall(rest)
				: undefined,
		);
		this.playRestOfChain();
	}

	/** Plays more cards of the same rank, if it is allowed to and can. */
	private playRestOfChain(): void {
		while (this.gameService.chain.length > 0) {
			const rank = this.gameService.chain[0].rank.value;
			const next = this.isEasy()
				? -1
				: this.cards.findIndex((card) => card.rank.value === rank);
			if (next === -1) this.gameService.endChain();
			else this.gameService.stageCard(this, next);
		}
	}

	private isEasy(): boolean {
		return this.gameService.difficulty() === Difficulty.EASY;
	}

	private static mostCommon<T>(counts: Map<T, number>): T {
		return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
	}
}
