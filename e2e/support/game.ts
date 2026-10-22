import { Locator, Page, expect } from "@playwright/test";

/**
 * Replaces Math.random with a seeded generator (mulberry32) so that the
 * shuffled deck - and therefore the whole game - is reproducible.
 */
export async function startGame(
	page: Page,
	seed: number,
	difficulty: "easy" | "normal" | "hard" = "easy",
	optionalRules: string[] = [],
): Promise<Game> {
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
	// a card for the test hooks. Its rank is a plain number, so a Queen is shown as "12♣", not "Q♣".
	await page.addInitScript(() => {
		(window as any).fakeCard = (rank: number, suit: string) => ({
			rank: { value: rank, toString: () => String(rank) },
			suit,
		});
	});
	await page.goto("/");
	const game = new Game(page);
	await game.chooseRules(optionalRules);
	// the easy bot plays the first legal card and never chains cards, which
	// keeps the scenarios below predictable
	await page.getByLabel("Bot difficulty").selectOption(difficulty);
	return game;
}

export class Game {
	readonly playerCards: Locator;
	readonly opponentCards: Locator;
	readonly discardTop: Locator;
	readonly pickCardButton: Locator;
	readonly missTurnButton: Locator;
	readonly status: Locator;
	readonly deckButton: Locator;
	readonly rulesButton: Locator;
	readonly endTurnButton: Locator;
	readonly macauButton: Locator;
	readonly rankModal: Locator;
	readonly suitModal: Locator;
	readonly discardPile: Locator;
	readonly gameOver: Locator;
	readonly newGameButton: Locator;
	readonly setupDialog: Locator;

	constructor(readonly page: Page) {
		this.playerCards = page.locator("app-player app-card");
		this.opponentCards = page.locator("app-opponent app-card-face-down");
		this.discardTop = page.locator("app-discard-pile app-card");
		this.pickCardButton = page.getByRole("button", { name: "Pick card" });
		this.missTurnButton = page.getByRole("button", { name: "Miss turn" });
		this.status = page.locator(".status");
		this.deckButton = page.getByRole("button", { name: "Draw pile" });
		this.rulesButton = page.getByRole("button", { name: "Rules" });
		this.endTurnButton = page.getByRole("button", { name: "End turn" });
		this.macauButton = page.getByRole("button", { name: "Macau!" });
		this.rankModal = page.locator(".card-called-modal");
		this.suitModal = page.locator(".suit-called-modal");
		this.discardPile = page.locator("app-discard-pile");
		this.gameOver = page.locator(".game-over");
		this.newGameButton = page.locator(".header__restart");
		this.setupDialog = page.getByRole("dialog", {
			name: "Choose the rules",
		});
	}

	/** Ticks the optional rules with these titles in the setup dialog (none by default) and starts the game. */
	async chooseRules(titles: string[] = []): Promise<void> {
		for (const title of titles)
			await this.setupDialog.getByLabel(title).check();
		await this.setupDialog
			.getByRole("button", { name: "Start game" })
			.click();
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

	/** Shortens the human's hand to a single card (dev-mode test hook `macauGame`), so one move ends the game. */
	async keepOnlyCard(index: number): Promise<void> {
		await this.keepCards([index]);
	}

	/** Keeps only the human's cards at the given positions. */
	async keepCards(indexes: number[]): Promise<void> {
		await this.page.evaluate((keep) => {
			const game = (window as any).macauGame;
			const hands = [...game.state().hands];
			hands[0] = keep.map((i) => hands[0][i]);
			game.patch({ hands });
		}, indexes);
	}

	/** Replaces the bot's hand with the given cards. */
	async setOpponentHand(
		cards: { rank: number; suit: string }[],
	): Promise<void> {
		await this.page.evaluate((newCards) => {
			const game = (window as any).macauGame;
			const hands = [...game.state().hands];
			hands[1] = newCards.map((c) =>
				(window as any).fakeCard(c.rank, c.suit),
			);
			game.patch({ hands });
		}, cards);
	}

	/** Puts a card on top of the draw pile, the next one to be picked. */
	async setNextCard(rank: number, suit: string): Promise<void> {
		await this.page.evaluate(
			({ rank, suit }) => {
				const game = (window as any).macauGame;
				game.patch({
					deck: [
						...game.state().deck,
						(window as any).fakeCard(rank, suit),
					],
				});
			},
			{ rank, suit },
		);
	}

	/** Adds a card to the human's hand. */
	async giveCard(rank: number, suit: string): Promise<void> {
		await this.page.evaluate(
			({ rank, suit }) => {
				const game = (window as any).macauGame;
				const hands = [...game.state().hands];
				hands[0] = [...hands[0], (window as any).fakeCard(rank, suit)];
				game.patch({ hands });
			},
			{ rank, suit },
		);
	}

	async play(index: number): Promise<void> {
		await this.playerCards.nth(index).click();
	}

	/** Waits for the top card of the discard pile, which only changes once the card has been rendered. */
	async expectTop(label: string): Promise<void> {
		await expect.poll(() => this.top()).toBe(label);
	}

	/** Waits for exactly these cards of the human's hand to be playable. */
	async expectEnabled(indexes: number[]): Promise<void> {
		await expect.poll(() => this.enabledIndexes()).toEqual(indexes);
	}
}

/** The bot waits ~1 s before acting. */
export const BOT_DELAY = 5_000;

export async function expectMyTurn(game: Game) {
	await expect(game.pickCardButton).toBeEnabled({ timeout: BOT_DELAY });
}

export async function expectBotsTurn(game: Game) {
	await expect(game.pickCardButton).toBeDisabled();
	await expect(game.playerCards.locator(".card--disabled")).toHaveCount(
		await game.playerCards.count(),
	);
}

export const rankOf = (label: string) => label.slice(0, -1);
export const suitOf = (label: string) => label.slice(-1);
