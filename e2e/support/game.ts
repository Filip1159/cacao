import { Locator, Page } from "@playwright/test";

/**
 * Replaces Math.random with a seeded generator (mulberry32) so that the
 * shuffled deck - and therefore the whole game - is reproducible.
 */
export async function startGame(page: Page, seed: number): Promise<Game> {
	await page.addInitScript((initialSeed) => {
		let a = initialSeed;
		Math.random = () => {
			a |= 0;
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}, seed);
	await page.goto("/");
	return new Game(page);
}

export class Game {
	readonly playerCards: Locator;
	readonly opponentCards: Locator;
	readonly discardTop: Locator;
	readonly pickCardButton: Locator;
	readonly missTurnButton: Locator;
	readonly playerState: Locator;
	readonly opponentState: Locator;
	readonly rankModal: Locator;
	readonly suitModal: Locator;
	readonly discardPile: Locator;
	readonly gameOver: Locator;
	readonly newGameButton: Locator;

	constructor(readonly page: Page) {
		this.playerCards = page.locator("app-player app-card");
		this.opponentCards = page.locator("app-opponent app-card-face-down");
		this.discardTop = page.locator("app-discard-pile app-card");
		this.pickCardButton = page.getByRole("button", { name: "Pick card" });
		this.missTurnButton = page.getByRole("button", { name: "Miss turn" });
		this.playerState = page.locator("#player_cards > span");
		this.opponentState = page.locator("#opponent_cards > span");
		this.rankModal = page.locator(".card-called-modal");
		this.suitModal = page.locator(".suit-called-modal");
		this.discardPile = page.locator("app-discard-pile");
		this.gameOver = page.locator(".game-over");
		this.newGameButton = page.locator(".header__restart");
	}

	/** Human-readable label of a card element, e.g. "10♠". */
	async label(card: Locator): Promise<string> {
		const rank = await card.locator(".number").first().innerText();
		const suit = await card.locator(".suit").first().innerText();
		return `${rank.trim()}${suit.trim()}`;
	}

	async hand(): Promise<string[]> {
		const cards = await this.playerCards.all();
		return Promise.all(cards.map((c) => this.label(c)));
	}

	async top(): Promise<string> {
		return this.label(this.discardTop);
	}

	/** Index of the first card in the human's hand satisfying the predicate on its label. */
	async indexOf(predicate: (label: string) => boolean): Promise<number> {
		return (await this.hand()).findIndex(predicate);
	}

	async isEnabled(index: number): Promise<boolean> {
		const card = this.playerCards.nth(index).locator(".card");
		return !(await card.evaluate((el) =>
			el.classList.contains("card--disabled"),
		));
	}

	async enabledIndexes(): Promise<number[]> {
		const count = await this.playerCards.count();
		const result: number[] = [];
		for (let i = 0; i < count; i++)
			if (await this.isEnabled(i)) result.push(i);
		return result;
	}

	/**
	 * Shortens the human's hand to a single card (dev-mode debug API), so one
	 * move ends the game.
	 */
	async keepOnlyCard(index: number): Promise<void> {
		await this.page.evaluate((i) => {
			const ng = (window as any).ng;
			const cards = ng.getComponent(
				document.querySelector("app-player"),
			).cards;
			const keep = cards[i];
			cards.length = 0;
			cards.push(keep);
			ng.applyChanges(document.querySelector("app-player"));
		}, index);
	}

	/** Replaces the bot's hand with the given cards. */
	async setOpponentHand(
		cards: { rank: number; suit: string }[],
	): Promise<void> {
		await this.page.evaluate((newCards) => {
			const ng = (window as any).ng;
			const hand = ng.getComponent(
				document.querySelector("app-opponent"),
			).cards;
			hand.length = 0;
			hand.push(
				...newCards.map((c) => ({
					rank: { value: c.rank, toString: () => String(c.rank) },
					suit: c.suit,
				})),
			);
			ng.applyChanges(document.querySelector("app-opponent"));
		}, cards);
	}

	async play(index: number): Promise<void> {
		await this.playerCards.nth(index).click();
	}
}

export const rankOf = (label: string) => label.slice(0, -1);
export const suitOf = (label: string) => label.slice(-1);
