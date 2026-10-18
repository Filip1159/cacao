import { Player } from "./Player";
import { GameService } from "../game.service";
import { CardService } from "../card.service";
import { RankCharacter } from "../../model/Rank";
import { Suit, getAllSuits } from "../../model/Suit";

export class BotPlayer extends Player {
	constructor(gameService: GameService, cardService: CardService) {
		super(gameService, cardService);
	}

	getBestMove(): number {
		for (let cardIndex in this.cards) {
			if (this.gameService.isLegalMove(this.cards[cardIndex]))
				return Number(cardIndex);
		}
		return -1;
	}

	chooseRankToCall(): number {
		const counts = new Map<number, number>();
		for (const card of this.cards) {
			const value = card.rank.value;
			if (value >= 5 && value <= 10)
				counts.set(value, (counts.get(value) ?? 0) + 1);
		}
		if (counts.size === 0) return 5 + Math.floor(Math.random() * 6);
		return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
	}

	chooseSuitToCall(): Suit {
		const counts = new Map<Suit, number>();
		for (const card of this.cards)
			counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
		if (counts.size === 0) {
			const suits = getAllSuits();
			return suits[Math.floor(Math.random() * suits.length)];
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
	}

	override playCard() {
		console.log("BotPlayer::playCard");
		this.chosenMove = this.getBestMove();
		if (this.chosenMove !== -1) {
			const playedCard = this.removeCard(this.chosenMove);
			this.chosenMove = -1;
			const cardCalled =
				playedCard.rank.value === RankCharacter.Jack
					? this.chooseRankToCall()
					: undefined;
			const suitCalled =
				playedCard.rank.value === RankCharacter.Ace
					? this.chooseSuitToCall()
					: undefined;
			this.gameService.afterCardPlayed(
				playedCard,
				cardCalled,
				suitCalled,
			);
		} else {
			this.drawCard();
			this.gameService.afterCardPlayed(null);
		}
		console.log("after BotPlayer::playCard");
	}
}
