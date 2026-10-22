import { Card } from "../model/Card";
import { RankCharacter } from "../model/Rank";
import { Suit } from "../model/Suit";
import { Turn } from "../model/enum/Turn";
import { GameState } from "../service/rules";
import { describeTurn } from "../service/status-message";
import { card, makeState, withRules } from "./support";

const turnOf = (
	hand: Card[],
	changes: Partial<GameState> & { top?: Card } = {},
) =>
	makeState({
		top: card(2, Suit.SPADES),
		hands: [hand, [card(5, Suit.CLUBS)]],
		...changes,
	});

describe("describeTurn", () => {
	it("invites the human to play", () => {
		expect(describeTurn(turnOf([card(9, Suit.SPADES)]))).toBe(
			"Your turn – play a card or pick one",
		);
	});

	it("names the card that passes a penalty on", () => {
		const state = turnOf([card(2, Suit.HEARTS)], {
			obligation: { kind: "pick", count: 2 },
		});
		expect(describeTurn(state)).toBe(
			"Pick 2 cards – or pass the penalty on with another 2",
		);
	});

	it("says a penalty can't be passed on without a card for it", () => {
		const state = turnOf([card(9, Suit.HEARTS)], {
			obligation: { kind: "pick", count: 2 },
		});
		expect(describeTurn(state)).toBe("You must pick 2 cards");
	});

	it("mentions any penalty card with Stacking penalties", () => {
		const state = turnOf([card(3, Suit.HEARTS)], {
			rules: withRules("anyPenaltyStacks"),
			obligation: { kind: "pick", count: 2 },
		});
		expect(describeTurn(state)).toContain("with a penalty card");
	});

	it("mentions the Queen with the Queen rule", () => {
		const rules = withRules("queenWild");
		const pick = turnOf([card(RankCharacter.Queen, Suit.HEARTS)], {
			rules,
			obligation: { kind: "pick", count: 2 },
		});
		const miss = turnOf([card(RankCharacter.Queen, Suit.HEARTS)], {
			rules,
			obligation: { kind: "miss", turns: 1 },
		});
		expect(describeTurn(pick)).toContain("or cancel it with a Q");
		expect(describeTurn(miss)).toBe(
			"You miss a turn – or pass it on with a 4 or cancel it with a Q",
		);
	});

	it("tells the owner of a Binding Jack that the call binds them too", () => {
		const state = turnOf([card(7, Suit.HEARTS)], {
			obligation: { kind: "rank", rank: 7 },
			demand: { rank: 7, owner: Turn.ME, stage: "owner" },
		});
		expect(describeTurn(state)).toBe(
			"You called 7 – now you have to play it too, or pick a card",
		);
	});

	it("tells about a picked card that can still be played", () => {
		const drawn = card(6, Suit.DIAMS);
		const state = turnOf([drawn], { drawn });
		expect(describeTurn(state)).toBe(
			"You picked 6♦ – play it, or end your turn and keep it",
		);
	});
});
