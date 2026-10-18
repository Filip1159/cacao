import { Component, signal } from "@angular/core";
import { PlayerComponent } from "./components/players/player/player.component";
import { OpponentComponent } from "./components/players/opponent/opponent.component";
import { GameOverComponent } from "./components/game-over/game-over.component";
import { StatusComponent } from "./components/status/status.component";
import { RulesModalComponent } from "./components/rules-modal/rules-modal.component";
import { Difficulty, getAllDifficulties } from "./model/enum/Difficulty";
import { GameService } from "./service/game.service";
import { DiscardPileComponent } from "./components/discard-pile/discard-pile.component";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"],
	imports: [
		PlayerComponent,
		OpponentComponent,
		DiscardPileComponent,
		GameOverComponent,
		StatusComponent,
		RulesModalComponent,
	],
})
export class AppComponent {
	showRules = signal(false);
	readonly difficulties = getAllDifficulties();
	readonly difficulty = this.gameService.difficulty;

	constructor(private gameService: GameService) {}

	setDifficulty(event: Event): void {
		this.gameService.difficulty.set(
			(event.target as HTMLSelectElement).value as Difficulty,
		);
	}

	restart(): void {
		this.gameService.restart();
	}
}
