import { Card, penaltyOf } from "../../model/Card";
import { RANK_FOUR, RankCharacter } from "../../model/Rank";
import { Turn } from "../../model/enum/Turn";
import {
	Call,
	GameState,
	NO_OBLIGATION,
	Obligation,
	PendingMiss,
	otherPlayer,
} from "./state";

// --- ending a turn ---

/** What a player had pending before their turn ended and hands over to the next one. */
interface CarriedOver {
	cardsToPick: number;
	turnsToMiss: number;
	pendingMiss: PendingMiss | null;
}

export function finishTurn(
	state: GameState,
	cards: Card[],
	call: Call,
): GameState {
	const current = state.turn;
	if (state.hands[current].length === 0) return { ...state, winner: current };
	const carried = collectCarriedOver(state, cards);
	const macauPending =
		current === Turn.ME
			? cards.length > 0 && state.hands[current].length === 1
			: state.macauPending;
	// the player whose turn it is now starts with a clean slate
	const next: GameState = {
		...state,
		turn: otherPlayer(current),
		obligation: NO_OBLIGATION,
		macauPending,
		drawn: null,
	};
	return applyDemand(
		applyCarriedOver(applyCards(next, cards, call), carried),
		state,
		cards,
		call,
	);
}

/**
 * With `jackBindsBoth`, a Jack's rank has to be played twice: by the
 * opponent, and then by the owner. Picking a card instead still counts as
 * having answered, a Queen cancels what is left of the call.
 */
function applyDemand(
	state: GameState,
	before: GameState,
	cards: Card[],
	call: Call,
): GameState {
	if (!before.rules.jackBindsBoth) return state;
	const last = cards[cards.length - 1];
	if (last?.rank.value === RankCharacter.Jack)
		return {
			...state,
			demand: { rank: call.rank!, owner: before.turn, stage: "opponent" },
		};
	const { demand } = before;
	if (!demand) return state;
	if (
		demand.stage === "owner" ||
		cards.some((card) => card.rank.value === RankCharacter.Queen)
	)
		return { ...state, demand: null };
	return {
		...state,
		demand: { ...demand, stage: "owner" },
		obligation: { kind: "rank", rank: demand.rank },
	};
}

function collectCarriedOver(state: GameState, cards: Card[]): CarriedOver {
	const { obligation } = state;
	const passesOnMiss =
		cards.some((card) => card.rank.value === RANK_FOUR) &&
		obligation.kind === "miss";
	return {
		// a countered penalty adds up
		cardsToPick:
			cards.length > 0 && obligation.kind === "pick"
				? obligation.count
				: 0,
		turnsToMiss:
			passesOnMiss && obligation.kind === "miss" ? obligation.turns : 0,
		// a player who still has turns to miss gets them back after the
		// other player has moved
		pendingMiss:
			cards.length === 0 &&
			obligation.kind === "miss" &&
			obligation.turns > 1
				? { player: state.turn, left: obligation.turns - 1 }
				: null,
	};
}

/** Applies the effect of the cards just played to the player whose turn it is now. */
function applyCards(state: GameState, cards: Card[], call: Call): GameState {
	if (cards.length === 0) return state;
	const penalty = cards.reduce((sum, card) => sum + penaltyOf(card), 0);
	const fours = cards.filter((card) => card.rank.value === RANK_FOUR).length;
	const last = cards[cards.length - 1];
	if (penalty > 0)
		return withObligation(state, { kind: "pick", count: penalty });
	if (fours > 0) return withObligation(state, { kind: "miss", turns: fours });
	if (last.rank.value === RankCharacter.Jack)
		return withObligation(state, { kind: "rank", rank: call.rank! });
	if (last.rank.value === RankCharacter.Ace)
		return withObligation(state, { kind: "suit", suit: call.suit! });
	return state;
}

function applyCarriedOver(state: GameState, carried: CarriedOver): GameState {
	let { obligation, pendingMiss } = state;
	if (obligation.kind === "pick")
		obligation = {
			kind: "pick",
			count: obligation.count + carried.cardsToPick,
		};
	else if (obligation.kind === "miss")
		obligation = {
			kind: "miss",
			turns: obligation.turns + carried.turnsToMiss,
		};
	if (pendingMiss?.player === state.turn) {
		if (obligation.kind === "none")
			obligation = { kind: "miss", turns: pendingMiss.left };
		pendingMiss = null;
	}
	return {
		...state,
		obligation,
		pendingMiss: carried.pendingMiss ?? pendingMiss,
	};
}

function withObligation(state: GameState, obligation: Obligation): GameState {
	return { ...state, obligation };
}
