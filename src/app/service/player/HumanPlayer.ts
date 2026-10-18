import { Player } from "./Player";
import { GameService } from "../game.service";
import { CardService } from "../card.service";
import { RankCharacter } from "../../model/Rank";

export class HumanPlayer extends Player {
	constructor(gameService: GameService, cardService: CardService) {
		super(gameService, cardService);
	}

	override playCard(): void {
		if (this.chosenMove !== -1) {
			const playedCard = this.removeCard(this.chosenMove);
			this.chosenMove = -1;
			let cardCalled;
			let suitCalled;
			if (playedCard.rank.value === RankCharacter.Jack)
				cardCalled = this.chosenRank;
			if (playedCard.rank.value === RankCharacter.Ace)
				suitCalled = this.chosenSuit;
			this.gameService.afterCardPlayed(
				playedCard,
				cardCalled,
				suitCalled,
			);
		} else {
			this.drawCard();
			this.gameService.afterCardPlayed(null);
		}
	}
}
