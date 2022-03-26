import {Player} from "./Player";
import {GameService} from "../game.service";
import {CardService} from "../card.service";
import {RankCharacter} from "../../model/Rank";

export class HumanPlayer extends Player {
	constructor(gameService: GameService, cardService: CardService) {
		super(gameService, cardService);
	}

	override playCard(): void {
		if (this.chosenMove !== -1) {
			const playedCard = this.removeCard(this.chosenMove)
			let cardCalled
			if (playedCard.rank.value === RankCharacter.Jack)
				cardCalled = this.chosenRank
			this.gameService.afterCardPlayed(playedCard, cardCalled)
		} else {
			this.addCard(this.cardService.pickCardFromTop())
			this.gameService.afterCardPlayed(null)
		}
	}
}
