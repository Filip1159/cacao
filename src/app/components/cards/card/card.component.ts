import {Component, Input, OnInit} from '@angular/core';
import {Card} from "../../../model/Card";
import {Suit} from "../../../model/Suit";

@Component({
	selector: 'app-card',
	templateUrl: './card.component.html',
	styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {
	@Input() card!: Card
	@Input() disabled!: boolean

	constructor() {
	}

	ngOnInit(): void {
	}

	get isRed(): boolean {
		return this.card.suit === Suit.DIAMS || this.card.suit === Suit.HEARTS
	}

	get isBlack(): boolean {
		return !this.isRed
	}
}
