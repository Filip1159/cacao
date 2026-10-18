import { Component, signal } from "@angular/core";
import { PlayerComponent } from "./components/players/player/player.component";
import { OpponentComponent } from "./components/players/opponent/opponent.component";
import { GameOverComponent } from "./components/game-over/game-over.component";
import { StatusComponent } from "./components/status/status.component";
import { RulesModalComponent } from "./components/rules-modal/rules-modal.component";
import { GameService } from "./service/game.service";
import { DiscardPileComponent } from "./components/discard-pile/discard-pile.component";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"],
	standalone: true,
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

	constructor(private gameService: GameService) {}

	restart(): void {
		this.gameService.restart();
	}
}
