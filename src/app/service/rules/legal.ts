import { Card, isAction, penaltyOf } from "../../model/Card";
import { RANK_FOUR, RankCharacter } from "../../model/Rank";
import { GameState, topOf } from "./state";

// --- legal moves ---

/** Whether the player whose turn it is may play the card now. */
export function isLegalMove(state: GameState, card: Card): boolean {
	return passesGuards(state, card) && matchesObligation(state, card);
}

/** What rules a card out whatever the player has to deal with. */
function passesGuards(state: GameState, card: Card): boolean {
	if (state.winner !== null) return false;
	// a card that was just picked has to be played, or kept
	if (state.drawn && !isSameCard(card, state.drawn)) return false;
	// the last card in hand can't be one with an effect
	if (
		state.rules.noActionFinish &&
		state.hands[state.turn].length === 1 &&
		isAction(card)
	)
		return false;
	return true;
}

/** Whether the card continues the chain, or answers what the player has to deal with. */
function matchesObligation(state: GameState, card: Card): boolean {
	if (state.chain.length > 0)
		return card.rank.value === state.chain[0].rank.value;
	const top = topOf(state);
	const { obligation, rules } = state;
	// a Queen goes on anything, whatever there is to deal with
	if (rules.queenWild && card.rank.value === RankCharacter.Queen) return true;
	switch (obligation.kind) {
		case "pick":
			// a penalty card passes (and adds to) the penalty: one of the same rank, or any with `anyPenaltyStacks`
			return (
				penaltyOf(card) > 0 &&
				(rules.anyPenaltyStacks || card.rank.value === top.rank.value)
			);
		case "rank":
			return obligation.rank === card.rank.value;
		case "suit":
			return obligation.suit === card.suit;
		case "miss":
			// a 4 passes the miss on to the other player
			return (
				card.rank.value === RANK_FOUR && top.rank.value === RANK_FOUR
			);
		case "none":
			return (
				card.rank.value === top.rank.value ||
				card.suit === top.suit ||
				(rules.queenWild && top.rank.value === RankCharacter.Queen)
			);
	}
}

/** Whether the player whose turn it is has any card to play. */
export function hasCounter(state: GameState): boolean {
	return state.hands[state.turn].some((card) => isLegalMove(state, card));
}

/** Whether the current player can add another card of the same rank this turn. */
export function canChain(state: GameState): boolean {
	if (state.chain.length === 0) return false;
	const rank = state.chain[0].rank.value;
	// Jacks and Aces need a call, so they are always played alone
	if (rank === RankCharacter.Jack || rank === RankCharacter.Ace) return false;
	return state.hands[state.turn].some(
		(card) => card.rank.value === rank && isLegalMove(state, card),
	);
}

const isSameCard = (a: Card, b: Card): boolean =>
	a.rank.value === b.rank.value && a.suit === b.suit;
