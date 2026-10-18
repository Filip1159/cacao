import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
	selector: "app-rules-modal",
	templateUrl: "./rules-modal.component.html",
	styleUrls: ["./rules-modal.component.scss"],
	standalone: true,
})
export class RulesModalComponent {
	@Input() visible = false;
	@Output() closed = new EventEmitter<void>();

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
