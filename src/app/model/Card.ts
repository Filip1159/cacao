import {Rank} from "./Rank";
import {Suit} from "./Suit";

export class Card {

	constructor(public rank: Rank, public suit: Suit) {
	}

	toString(): string {
		return `{rank: ${this.rank.toString()}, suit: ${this.suit}}`
	}
}
