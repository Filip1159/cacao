import { Component } from "@angular/core";
import { GameService } from "../../service/game.service";
import { CardFaceDownComponent } from "../cards/card-face-down/card-face-down.component";

@Component({
	selector: "app-draw-pile",
	templateUrl: "./draw-pile.component.html",
	styleUrls: ["./draw-pile.component.scss"],
	imports: [CardFaceDownComponent],
})
export class DrawPileComponent {
	constructor(readonly game: GameService) {}
}
