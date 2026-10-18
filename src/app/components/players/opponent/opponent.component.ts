import { Component } from "@angular/core";
import { GameService } from "../../../service/game.service";
import { CardFaceDownComponent } from "../../cards/card-face-down/card-face-down.component";

@Component({
	selector: "app-opponent",
	templateUrl: "./opponent.component.html",
	styleUrls: ["./opponent.component.scss"],
	imports: [CardFaceDownComponent],
})
export class OpponentComponent {
	readonly cards = this.game.opponentHand;

	constructor(readonly game: GameService) {}
}
