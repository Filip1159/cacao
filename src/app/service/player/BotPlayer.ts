import {Player} from "./Player";
import {GameService} from "../game.service";
import {CardService} from "../card.service";

export class BotPlayer extends Player {
	constructor(gameService: GameService, cardService: CardService) {
		super(gameService, cardService);
	}

	getBestMove(): number {
		for (let cardIndex in this.cards) {
			if (this.gameService.isLegalMove(this.cards[cardIndex])) return Number(cardIndex);
		}
		return -1;
	}

	override playCard() {
		this.chosenMove = this.getBestMove()
		if (this.chosenMove !== -1) {
			const playedCard = this.removeCard(this.getBestMove())
			this.gameService.afterCardPlayed(playedCard)
		} else {
			this.addCard(this.cardService.pickCardFromTop())
			this.gameService.afterCardPlayed(null)
		}
	}
}
