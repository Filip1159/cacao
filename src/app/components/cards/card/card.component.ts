import {
	Component,
	ElementRef,
	Input,
	OnChanges,
	OnInit,
	SimpleChanges,
} from "@angular/core";
import { Card } from "../../../model/Card";
import { Suit } from "../../../model/Suit";

@Component({
	selector: "app-card",
	templateUrl: "./card.component.html",
	styleUrls: ["./card.component.scss"],
	standalone: true,
})
export class CardComponent implements OnInit, OnChanges {
	@Input() card!: Card;
	@Input() disabled!: boolean;

	constructor(private host: ElementRef<HTMLElement>) {}

	/** Plays the "card dealt" animation again when the card shown changes, e.g. on the discard pile. */
	ngOnChanges(changes: SimpleChanges): void {
		if (!changes["card"] || changes["card"].firstChange) return;
		const element = this.host.nativeElement.firstElementChild;
		const reduceMotion = matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		if (!element || reduceMotion || !element.animate) return;
		element.animate(
			[
				{ opacity: 0, transform: "translateY(-16px) scale(0.92)" },
				{ opacity: 1, transform: "none" },
			],
			{ duration: 250, easing: "ease-out" },
		);
	}

	ngOnInit(): void {}

	get isRed(): boolean {
		return this.card.suit === Suit.DIAMS || this.card.suit === Suit.HEARTS;
	}

	get isBlack(): boolean {
		return !this.isRed;
	}
}
