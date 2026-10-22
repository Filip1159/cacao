import {
	Component,
	EventEmitter,
	Input,
	Output,
	computed,
} from "@angular/core";
import { RULE_INFO } from "../../model/rule-options";
import { GameService } from "../../service/game.service";

@Component({
	selector: "app-rules-modal",
	templateUrl: "./rules-modal.component.html",
	styleUrls: ["./rules-modal.component.scss"],
})
export class RulesModalComponent {
	@Input() visible = false;
	@Output() closed = new EventEmitter<void>();

	/** The optional rules switched on for this game. */
	readonly optional = computed(() =>
		RULE_INFO.filter((rule) => this.game.rules()[rule.id]),
	);

	constructor(private game: GameService) {}

	readonly rules: { card: string; effect: string }[] = [
		{ card: "2", effect: "Next player picks 2 cards" },
		{ card: "3", effect: "Next player picks 3 cards" },
		{ card: "4", effect: "Next player misses a turn" },
		{
			card: "J",
			effect: "You call a rank (5–10); next player must play it or pick a card",
		},
		{
			card: "A",
			effect: "You call a suit; next player must play it or pick a card",
		},
		{ card: "K♥ / K♠", effect: "Next player picks 5 cards" },
		{ card: "K♦ / K♣, Q, 5–10", effect: "No effect" },
	];
}
