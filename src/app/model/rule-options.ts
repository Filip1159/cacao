/** The optional rules a game can be played with. To add one: its id here, its text below, and the rule itself. */
export const RULE_IDS = [
	"queenWild",
	"jackBindsBoth",
	"anyPenaltyStacks",
	"noActionFinish",
	"playAfterDraw",
] as const;

export type RuleId = (typeof RULE_IDS)[number];

/** Which optional rules are switched on. */
export type RuleOptions = Record<RuleId, boolean>;

/** All of them are off by default. */
export const DEFAULT_RULES: RuleOptions = Object.fromEntries(
	RULE_IDS.map((id) => [id, false]),
) as RuleOptions;

export interface RuleInfo {
	id: RuleId;
	title: string;
	description: string;
}

/** What the setup dialog and the rules dialog tell about each optional rule; a rule without text doesn't compile. */
const RULE_TEXT: Record<RuleId, Omit<RuleInfo, "id">> = {
	queenWild: {
		title: "Queen",
		description:
			"A Queen can be played on any card and cancels every pending effect: picking cards, missing turns, a called rank or suit. Any card can be played on a Queen.",
	},
	jackBindsBoth: {
		title: "Binding Jack",
		description:
			"The rank called with a Jack has to be played by the opponent and then by the player who played the Jack – or they pick a card instead. After that the call is over.",
	},
	anyPenaltyStacks: {
		title: "Stacking penalties",
		description:
			"Any penalty card (2, 3, K♥, K♠) can be played on a pending penalty to pass it on, not just a card of the same rank. The penalties add up.",
	},
	noActionFinish: {
		title: "No finishing on an action card",
		description:
			"You can't win with your last card being a 2, 3, 4, Jack, Ace or penalty King: it can't be played while it is the only card you have left, so you have to pick a card instead.",
	},
	playAfterDraw: {
		title: "Playing the drawn card",
		description:
			"After picking a single card you may play it straight away if it can be played, or end your turn and keep it. Picked penalty cards can't be played.",
	},
};

export const RULE_INFO: RuleInfo[] = RULE_IDS.map((id) => ({
	id,
	...RULE_TEXT[id],
}));
