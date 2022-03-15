import {Injectable} from '@angular/core';
import {Card} from "../model/Card";
import {Suit, getAllSuits} from "../model/Suit";
import {Rank, RankCharacter} from "../model/Rank";
import {PlayerService} from "./player.service";

@Injectable({
	providedIn: 'root'
})
export class CardService {
	protected deck: Card[] = [];
	protected discardPile: Card[] = []

	constructor() {
		this.init()
	}

	protected init(): void {
		this.deck = CardService.createFullDeck()
		this.shuffleDeck()
		this.discardPile = [this.pickBasicCardFromTop()]
	}

	dealCards(players: PlayerService[]): void {
		for (let i = 0; i < 5; i++) {
			for (let player of players) {
				player.addCard(this.deck.pop()!)
			}
		}
	}

	pickBasicCardFromTop(): Card {
		let result = this.pickCardFromTop()
		while (CardService.isSpecialCard(result)) {
			this.deck.unshift(result)
			result = this.pickCardFromTop()
		}
		return result;
	}

	pickCardFromTop(): Card {
		return this.deck.pop()!
	}

	get discardPileTop(): Card {
		return this.discardPile[this.discardPile.length - 1]
	}

	putCardOnDiscardPile(card: Card): void {
		this.discardPile.push(card)
	}

	protected static createFullDeck(): Card[] {
		const deck: Card[] = []
		const suits = getAllSuits()
		const ranks = Rank.getAllRanks()
		for (let suit of suits)
			for (let rank of ranks)
				deck.push({ rank, suit })
		return deck;
	}

	protected static isSpecialCard(card: Card): boolean {
		if (card.rank.value == RankCharacter.King && (card.suit == Suit.DIAMS || card.suit == Suit.CLUBS)) return false;
		return card.rank.value <= 4 || card.rank.value >= RankCharacter.Jack
	}

	protected shuffleDeck() {
		for (let i = this.deck.length-1; i>0; i--) {
			const j = Math.floor(Math.random() * (i+1));
			const temp = this.deck[i];
			this.deck[i] = this.deck[j];
			this.deck[j] = temp;
		}
	}

	printDeck(): void {
		for (let card of this.deck) {
			console.log(this.cardToString(card))
		}
	}

	cardToString(card: Card): string {
		let suit
		switch (card.suit) {
			case Suit.HEARTS:
				suit = '♥'
				break
			case Suit.DIAMS:
				suit = '♦'
				break
			case Suit.SPADES:
				suit = '♠'
				break
			case Suit.CLUBS:
				suit = '♣'
				break
			default:
				throw new Error("Internal error")
		}
		return `{rank: ${card.rank.toString()}, suit: ${suit}}`
	}
}
