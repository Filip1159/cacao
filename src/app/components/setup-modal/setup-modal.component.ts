import { Component, signal } from "@angular/core";
import { GameService } from "../../service/game.service";
import {
	DEFAULT_RULES,
	RULE_INFO,
	RuleId,
	RuleOptions,
} from "../../model/rule-options";

/** Asks which optional rules to play with before a game starts. */
@Component({
	selector: "app-setup-modal",
	templateUrl: "./setup-modal.component.html",
	styleUrls: ["./setup-modal.component.scss"],
})
export class SetupModalComponent {
	readonly info = RULE_INFO;
	/** The choice being made, starting from the rules of the last game. */
	readonly chosen = signal<RuleOptions>({ ...DEFAULT_RULES });

	constructor(readonly game: GameService) {
		this.chosen.set({ ...game.rules() });
	}

	toggle(id: RuleId, event: Event): void {
		const checked = (event.target as HTMLInputElement).checked;
		this.chosen.update((rules) => ({ ...rules, [id]: checked }));
	}

	reset(): void {
		this.chosen.set({ ...DEFAULT_RULES });
	}

	start(): void {
		this.game.start(this.chosen());
	}
}
