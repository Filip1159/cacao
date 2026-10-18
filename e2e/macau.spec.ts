import { expect, test } from "@playwright/test";
import { Game, startGame } from "./support/game";

/*
 * The deck is shuffled with Math.random, which `startGame` replaces with a
 * seeded generator, so every seed below always produces the same deal:
 *
 *   seed  top  human hand            notes
 *   1     8♠   2♥ J♣ 2♦ A♣ 5♣        no playable card; bot answers a draw with 2♠
 *   2     5♦   3♦ 5♣ J♦ 10♠ 9♠       3♦, 5♣, J♦ playable; bot has no 7
 *   3     5♥   Q♠ 9♣ K♥ 10♥ 4♠       K♥ playable
 *   5     6♠   6♥ 9♠ K♣ 8♠ 2♠        2♠ playable
 *   8     10♥  7♠ 10♠ 10♦ Q♥ 4♥      4♥ playable
 *   21    7♦   K♣ 3♣ 8♦ 9♥ K♦        K♦ playable; bot answers with 4♦
 *   62    4♥   9♦ 2♦ 7♣ 9♣ 3♦ (+8♥)  after drawing, bot plays a 4
 */
const BOT_DELAY = 5_000; // the bot waits ~1 s before acting

async function expectMyTurn(game: Game) {
	await expect(game.pickCardButton).toBeEnabled({ timeout: BOT_DELAY });
}

async function expectBotsTurn(game: Game) {
	await expect(game.pickCardButton).toBeDisabled();
	await expect(game.playerCards.locator(".card--disabled")).toHaveCount(
		await game.playerCards.count(),
	);
}

test.describe("initial table", () => {
	test("shows both hands, the discard pile and the controls", async ({
		page,
	}) => {
		const game = await startGame(page, 1);

		await expect(game.playerCards).toHaveCount(5);
		await expect(game.opponentCards).toHaveCount(5);
		await expect(game.discardTop).toHaveCount(1);
		expect(await game.top()).toBe("8♠");
		expect(await game.hand()).toEqual(["2♥", "J♣", "2♦", "A♣", "5♣"]);
		await expect(game.pickCardButton).toBeEnabled();
		await expect(game.missTurnButton).toBeDisabled();
		await expect(game.rankModal).toBeHidden();
	});

	test("only cards matching the discard pile's rank or suit are playable", async ({
		page,
	}) => {
		const game = await startGame(page, 2);

		// top 5♦: 3♦ (suit), 5♣ (rank), J♦ (suit) are playable; 10♠, 9♠ are not
		expect(await game.enabledIndexes()).toEqual([0, 1, 2]);
	});

	test("no card is playable when nothing matches", async ({ page }) => {
		const game = await startGame(page, 1);

		expect(await game.enabledIndexes()).toEqual([]);
	});
});

test.describe("human turn", () => {
	test("clicking an unplayable card does nothing", async ({ page }) => {
		const game = await startGame(page, 2);

		await game.play(3); // 10♠ on 5♦

		await expect(game.playerCards).toHaveCount(5);
		expect(await game.top()).toBe("5♦");
		await expect(game.opponentCards).toHaveCount(5);
		await expect(game.rankModal).toBeHidden();
		await expect(game.pickCardButton).toBeEnabled();
	});

	test("playing a card moves it to the discard pile and hands over to the bot", async ({
		page,
	}) => {
		const game = await startGame(page, 2);

		await game.play(1); // 5♣

		await expect(game.playerCards).toHaveCount(4);
		expect(await game.top()).toBe("5♣");
		await expectBotsTurn(game);
		await expectMyTurn(game);
	});

	test("picking a card adds one to the hand and ends the turn", async ({
		page,
	}) => {
		const game = await startGame(page, 1);

		await game.pickCardButton.click();

		await expect(game.playerCards).toHaveCount(6);
		expect((await game.hand())[5]).toBe("9♦");
		await expectBotsTurn(game);
	});

	test("the bot answers after a short delay", async ({ page }) => {
		const game = await startGame(page, 1);

		await game.pickCardButton.click();
		await expect(game.opponentCards).toHaveCount(5);

		// the bot plays 2♠, its only legal card
		await expect(game.opponentCards).toHaveCount(4, {
			timeout: BOT_DELAY,
		});
		expect(await game.top()).toBe("2♠");
	});
});

test.describe("special cards", () => {
	test("2 forces the bot to draw 2 cards", async ({ page }) => {
		const game = await startGame(page, 5);

		await game.play(4); // 2♠

		await expect(game.opponentCards).toHaveCount(7, {
			timeout: BOT_DELAY,
		});
		await expectMyTurn(game);
	});

	test("K♥ forces the bot to draw 5 cards", async ({ page }) => {
		const game = await startGame(page, 3);

		await game.play(2); // K♥

		await expect(game.opponentCards).toHaveCount(10, {
			timeout: BOT_DELAY,
		});
		await expectMyTurn(game);
	});

	test("K♦ has no effect", async ({ page }) => {
		const game = await startGame(page, 21);

		await game.play(4); // K♦

		// the bot just plays 4♦ instead of drawing
		await expect(game.opponentCards).toHaveCount(4, {
			timeout: BOT_DELAY,
		});
		expect(await game.top()).toBe("4♦");
	});

	test("4 makes the bot miss its turn", async ({ page }) => {
		const game = await startGame(page, 8);

		await game.play(4); // 4♥
		await expectBotsTurn(game);

		// the bot neither plays nor draws, and the turn comes back to us
		await expectMyTurn(game);
		await expect(game.opponentCards).toHaveCount(5);
		expect(await game.top()).toBe("4♥");
	});

	test("J asks for a rank; the bot must draw when it has none", async ({
		page,
	}) => {
		const game = await startGame(page, 2);

		await game.play(2); // J♦
		await expect(game.rankModal).toBeVisible();
		await expect(game.playerCards).toHaveCount(5); // not played yet

		await game.rankModal.getByRole("button", { name: "7" }).click();

		await expect(game.rankModal).toBeHidden();
		await expect(game.playerCards).toHaveCount(4);
		expect(await game.top()).toBe("J♦");
		await expect(game.opponentCards).toHaveCount(6, {
			timeout: BOT_DELAY,
		});
		await expectMyTurn(game);
	});

	test("the rank dialog offers 5 to 10, including 5", async ({ page }) => {
		const game = await startGame(page, 2);

		await game.play(2); // J♦
		const buttons = game.rankModal.getByRole("button");
		await expect(buttons).toHaveText(["5", "6", "7", "8", "9", "10"]);

		await buttons.first().click();

		await expect(game.rankModal).toBeHidden();
		expect(await game.top()).toBe("J♦");
	});
});

test.describe("penalties against the human", () => {
	test("after the bot plays a 2 the human has to pick 2 cards", async ({
		page,
	}) => {
		const game = await startGame(page, 1);
		await game.pickCardButton.click();
		await expect(game.playerState).toHaveText("CARD_PICKING", {
			timeout: BOT_DELAY,
		});
		await expectMyTurn(game);
		await expect(game.playerCards).toHaveCount(6);
		await expect(game.missTurnButton).toBeDisabled();
		// none of the cards can be played, whatever they are
		expect(await game.enabledIndexes()).toEqual([]);

		await game.pickCardButton.click();

		await expect(game.playerCards).toHaveCount(8);
	});

	test("after the bot plays a 4 the human can only miss the turn", async ({
		page,
	}) => {
		const game = await startGame(page, 62);
		await game.pickCardButton.click();
		await expect(game.playerState).toHaveText("MISSING", {
			timeout: BOT_DELAY,
		});

		await expect(game.missTurnButton).toBeEnabled();
		expect(await game.enabledIndexes()).toEqual([]);

		await game.missTurnButton.click();

		// the miss is over: the bot moves, then it's our turn again
		await expect(game.missTurnButton).toBeDisabled();
		await expect(game.playerState).not.toHaveText("MISSING", {
			timeout: BOT_DELAY,
		});
		await expect(game.playerCards).toHaveCount(6);
	});

	test("Pick card is usable again after missing a turn", async ({ page }) => {
		const game = await startGame(page, 62);
		await game.pickCardButton.click();
		await expect(game.playerState).toHaveText("MISSING", {
			timeout: BOT_DELAY,
		});
		await game.missTurnButton.click();
		await expect(game.playerState).not.toHaveText("MISSING", {
			timeout: BOT_DELAY,
		});

		await expectMyTurn(game);
	});

	test("Pick card is disabled while the human has to miss a turn", async ({
		page,
	}) => {
		const game = await startGame(page, 62);
		await game.pickCardButton.click();
		await expect(game.playerState).toHaveText("MISSING", {
			timeout: BOT_DELAY,
		});

		await expect(game.pickCardButton).toBeDisabled();
	});
});
