import { Component } from "@angular/core";
import { GameService } from "../../service/game.service";
import { Turn } from "../../model/enum/Turn";

@Component({
	selector: "app-game-over",
	templateUrl: "./game-over.component.html",
	styleUrls: ["./game-over.component.scss"],
	standalone: true,
})
export class GameOverComponent {
	constructor(public gameService: GameService) {}

	get playerWon(): boolean {
		return this.gameService.winner() === Turn.ME;
	}
}
