import { Turn } from "../model/enum/Turn";
import { GameState, hasCounter, topOf } from "./rules";

/** What the status line tells the human about the current state of the game. */
export function describeTurn(state: GameState): string {
	if (state.winner !== null) return "Game over";
	if (state.macauPending) return "You have one card left – press Macau!";
	if (state.turn === Turn.OPPONENT) return "Opponent is thinking…";
	if (state.drawn)
		return `You picked ${state.drawn.rank}${state.drawn.suit} – play it, or end your turn and keep it`;
	if (state.chain.length > 0)
		return `Play another ${state.chain[0].rank} – or end your turn`;
	const { obligation } = state;
	const canCounter = hasCounter(state);
	switch (obligation.kind) {
		case "pick":
			return canCounter
				? `Pick ${obligation.count} cards – or pass the penalty on with ${penaltyCounter(state)}${queenHint(state)}`
				: `You must pick ${obligation.count} cards`;
		case "miss":
			return canCounter
				? `You miss a turn – or pass it on with a 4${queenHint(state)}`
				: "You miss a turn";
		case "rank":
			if (state.demand?.stage === "owner")
				return `You called ${obligation.rank} – now you have to play it too, or pick a card`;
			return `Opponent called ${obligation.rank} – play it or pick a card`;
		case "suit":
			return `Opponent called ${obligation.suit} – play that suit or pick a card`;
		case "none":
			return "Your turn – play a card or pick one";
	}
}

/** The card that passes a penalty on: any penalty card with `anyPenaltyStacks`, otherwise one of the same rank. */
const penaltyCounter = (state: GameState): string =>
	state.rules.anyPenaltyStacks
		? "a penalty card"
		: `another ${topOf(state).rank}`;

/** With `queenWild` a Queen answers a penalty or a miss as well. */
const queenHint = (state: GameState): string =>
	state.rules.queenWild ? " or cancel it with a Q" : "";
