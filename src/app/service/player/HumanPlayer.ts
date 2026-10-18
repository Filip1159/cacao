import { Player } from "./Player";
import { GameService } from "../game.service";
import { CardService } from "../card.service";
import { RankCharacter } from "../../model/Rank";

export class HumanPlayer extends Player {
	constructor(gameService: GameService, cardService: CardService) {
		super(gameService, cardService);
	}

	override playCard(): void {
		if (this.chosenMove === -1) {
			this.gameService.pickCards(this);
			return;
		}
		const index = this.chosenMove;
		this.chosenMove = -1;
		const rank = this.cards[index].rank.value;
		this.gameService.stageCard(
			this,
			index,
			rank === RankCharacter.Jack ? this.chosenRank : undefined,
			rank === RankCharacter.Ace ? this.chosenSuit : undefined,
		);
	}
}
