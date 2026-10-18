import { Card, penaltyOf } from "../model/Card";
import { Difficulty } from "../model/enum/Difficulty";
import { Turn } from "../model/enum/Turn";
import { CALLABLE_RANKS, RANK_FOUR, RankCharacter } from "../model/Rank";
import { Suit, getAllSuits } from "../model/Suit";
import { Shuffle } from "../model/deck";
import {
	GameState,
	endChain,
	hasCounter,
	isLegalMove,
	missTurn,
	pickCards,
	playCard,
} from "./rules";

/** The human has this many cards or fewer: attack cards become the top priority. */
const ATTACK_THRESHOLD: Record<Difficulty, number> = {
	[Difficulty.EASY]: 0,
	[Difficulty.NORMAL]: 3,
	[Difficulty.HARD]: Infinity,
};

/** The bot takes its whole turn: plays cards, picks cards or misses the turn. */
export function playBotTurn(
	state: GameState,
	difficulty: Difficulty,
	shuffle: Shuffle,
): GameState {
	switch (state.obligation.kind) {
		case "miss":
			return hasCounter(state)
				? playBestCard(state, difficulty, shuffle)
				: missTurn(state);
		case "pick":
			return hasCounter(state)
				? playBestCard(state, difficulty, shuffle)
				: pickCards(state, shuffle);
		default:
			return playBestCard(state, difficulty, shuffle);
	}
}

/**
 * Picks the card to play, -1 if there is none.
 *
 * Easy plays the first legal card. Otherwise the legal card with the best
 * score wins, the earliest one on a tie: plain cards go first, Jacks and
 * Aces are saved for later and attack cards (penalties and 4s) are held
 * back until the human is close to winning. Hard attacks right away.
 */
export function getBestMove(state: GameState, difficulty: Difficulty): number {
	const hand = state.hands[Turn.OPPONENT];
	if (difficulty === Difficulty.EASY)
		return hand.findIndex((card) => isLegalMove(state, card));
	const attack = state.hands[Turn.ME].length <= ATTACK_THRESHOLD[difficulty];
	let best = -1;
	let bestScore = -Infinity;
	hand.forEach((card, index) => {
		if (!isLegalMove(state, card)) return;
		const score = scoreOf(card, attack);
		if (score > bestScore) {
			best = index;
			bestScore = score;
		}
	});
	return best;
}

/** The rank (5-10) it holds most of; a random one on Easy or without any. */
export function chooseRankToCall(hand: Card[], difficulty: Difficulty): number {
	const counts = new Map<number, number>();
	for (const card of hand) {
		const value = card.rank.value;
		if (CALLABLE_RANKS.includes(value))
			counts.set(value, (counts.get(value) ?? 0) + 1);
	}
	if (counts.size === 0 || difficulty === Difficulty.EASY)
		return CALLABLE_RANKS[
			Math.floor(Math.random() * CALLABLE_RANKS.length)
		];
	return mostCommon(counts);
}

/** The suit it holds most of; a random one on Easy or without any. */
export function chooseSuitToCall(hand: Card[], difficulty: Difficulty): Suit {
	const counts = new Map<Suit, number>();
	for (const card of hand)
		counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
	if (counts.size === 0 || difficulty === Difficulty.EASY) {
		const suits = getAllSuits();
		return suits[Math.floor(Math.random() * suits.length)];
	}
	return mostCommon(counts);
}

function playBestCard(
	state: GameState,
	difficulty: Difficulty,
	shuffle: Shuffle,
): GameState {
	const move = getBestMove(state, difficulty);
	if (move === -1) return pickCards(state, shuffle);
	const hand = state.hands[Turn.OPPONENT];
	const rank = hand[move].rank.value;
	const rest = hand.filter((_, index) => index !== move);
	let next = playCard(state, move, {
		rank:
			rank === RankCharacter.Jack
				? chooseRankToCall(rest, difficulty)
				: undefined,
		suit:
			rank === RankCharacter.Ace
				? chooseSuitToCall(rest, difficulty)
				: undefined,
	});
	// plays more cards of the same rank, if it is allowed to and can
	while (next.chain.length > 0) {
		const chainRank = next.chain[0].rank.value;
		const more =
			difficulty === Difficulty.EASY
				? -1
				: next.hands[Turn.OPPONENT].findIndex(
						(card) => card.rank.value === chainRank,
					);
		next = more === -1 ? endChain(next) : playCard(next, more);
	}
	return next;
}

function scoreOf(card: Card, attack: boolean): number {
	if (card.rank.value === RankCharacter.Jack) return 5;
	if (card.rank.value === RankCharacter.Ace) return 4;
	if (penaltyOf(card) > 0 || card.rank.value === RANK_FOUR)
		return attack ? 20 : 8;
	return 10;
}

function mostCommon<T>(counts: Map<T, number>): T {
	return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
