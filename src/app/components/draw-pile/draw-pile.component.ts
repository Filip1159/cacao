import { Component } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { GameService } from "../../service/game.service";
import { CardFaceDownComponent } from "../cards/card-face-down/card-face-down.component";

@Component({
	selector: "app-draw-pile",
	templateUrl: "./draw-pile.component.html",
	styleUrls: ["./draw-pile.component.scss"],
	standalone: true,
	imports: [CardFaceDownComponent, AsyncPipe],
})
export class DrawPileComponent {
	// emits on every turn change so the view is re-checked
	turn$ = this.gameService.turn;

	constructor(public gameService: GameService) {}

	canPick(turn: unknown): boolean {
		return turn !== null && this.gameService.canHumanPick();
	}
}
