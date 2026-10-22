import { Component, computed } from "@angular/core";
import { GameService } from "../../service/game.service";
import { describeTurn } from "../../service/status-message";

@Component({
	selector: "app-status",
	templateUrl: "./status.component.html",
	styleUrls: ["./status.component.scss"],
})
export class StatusComponent {
	readonly turn = computed(() => this.game.state().turn);
	readonly message = computed(() => {
		const notice = this.game.notice();
		const base = describeTurn(this.game.state());
		return notice ? `${notice} ${base}` : base;
	});

	constructor(readonly game: GameService) {}
}
