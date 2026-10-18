import { Component } from "@angular/core";
import { Turn } from "../../model/enum/Turn";
import { GameService } from "../../service/game.service";
import { CardComponent } from "../cards/card/card.component";
import { DrawPileComponent } from "../draw-pile/draw-pile.component";

@Component({
	selector: "app-discard-pile",
	templateUrl: "./discard-pile.component.html",
	styleUrls: ["./discard-pile.component.scss"],
	imports: [CardComponent, DrawPileComponent],
})
export class DiscardPileComponent {
	readonly state = this.game.state;
	/** A card the bot played slides in from its hand. */
	readonly origin = () =>
		this.game.lastPlayer() === Turn.OPPONENT
			? document.querySelector("#opponent_cards .hand__cards")
			: null;

	constructor(readonly game: GameService) {}
}
