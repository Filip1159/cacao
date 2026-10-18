import {
	Component,
	ElementRef,
	Input,
	OnChanges,
	SimpleChanges,
} from "@angular/core";
import { Card } from "../../../model/Card";
import { Suit } from "../../../model/Suit";

@Component({
	selector: "app-card",
	templateUrl: "./card.component.html",
	styleUrls: ["./card.component.scss"],
})
export class CardComponent implements OnChanges {
	@Input() card!: Card;
	@Input() disabled!: boolean;
	/** Where a newly shown card comes from; it drops in from above when this is missing or returns nothing. */
	@Input() origin?: () => Element | null;

	constructor(private host: ElementRef<HTMLElement>) {}

	/** Plays the "card dealt" animation again when the card shown changes, e.g. on the discard pile. */
	ngOnChanges(changes: SimpleChanges): void {
		if (!changes["card"] || changes["card"].firstChange) return;
		const element = this.host.nativeElement.firstElementChild;
		const reduceMotion = matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		if (!element || reduceMotion || !element.animate) return;
		const from = this.origin?.();
		element.animate(
			from
				? [
						{
							transform: this.slideFrom(element, from),
							opacity: 0.4,
						},
						{ transform: "none", opacity: 1 },
					]
				: [
						{
							opacity: 0,
							transform: "translateY(-16px) scale(0.92)",
						},
						{ opacity: 1, transform: "none" },
					],
			{ duration: from ? 450 : 250, easing: "ease-out" },
		);
	}

	/** A transform that puts the card on top of `from`, e.g. the opponent's hand. */
	private slideFrom(element: Element, from: Element): string {
		const to = element.getBoundingClientRect();
		const start = from.getBoundingClientRect();
		// on small screens the card is zoomed (also by its parents), which scales its transform too
		let zoom = 1;
		for (let e: Element | null = element; e; e = e.parentElement)
			zoom *= parseFloat(getComputedStyle(e).zoom) || 1;
		const dx =
			(start.left + start.width / 2 - (to.left + to.width / 2)) / zoom;
		const dy =
			(start.top + start.height / 2 - (to.top + to.height / 2)) / zoom;
		return `translate(${dx}px, ${dy}px) scale(0.9)`;
	}

	get isRed(): boolean {
		return this.card.suit === Suit.DIAMS || this.card.suit === Suit.HEARTS;
	}

	get isBlack(): boolean {
		return !this.isRed;
	}
}
