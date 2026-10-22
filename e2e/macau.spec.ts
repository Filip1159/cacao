import { expect, test } from "@playwright/test";
import {
	BOT_DELAY,
	Game,
	expectBotsTurn,
	expectMyTurn,
	startGame,
} from "./support/game";

/*
 * The deck is shuffled with Math.random, which `startGame` replaces with a
 * seeded generator, so every seed below always produces the same deal:
 *
 *   seed  top  human hand            notes
 *   1     8♠   2♥ J♣ 2♦ A♣ 5♣        no playable card; bot answers a draw with 2♠
 *   2     5♦   3♦ 5♣ J♦ 10♠ 9♠       3♦, 5♣, J♦ playable; bot has no 7
 *   3     5♥   Q♠ 9♣ K♥ 10♥ 4♠       K♥ playable
 *   5     6♠   6♥ 9♠ K♣ 8♠ 2♠        2♠ playable; the bot passes it back with 2♥
 *   133   5♠   9♣ 4♣ 2♠ 8♦ 2♥        2♠ playable; the bot has no 2
 *   8     10♥  7♠ 10♠ 10♦ Q♥ 4♥      4♥ playable; the bot passes it back with 4♦
 *   15    9♦   K♣ Q♥ 6♣ 4♥ 4♦        4♦ playable; the bot has no 4
 *   21    7♦   K♣ 3♣ 8♦ 9♥ K♦        K♦ playable; bot answers with 4♦
 *   33    7♠   2♥ A♠ 2♠ 4♣ 9♠        A♠ playable
 *   63    4♥   (after drawing) 3♦ 8♦ 2♦ 7♣ J♣ 4♣; the bot plays 4♥, we can pass it back with 4♣
 *   62    4♥   9♦ 2♦ 7♣ 9♣ 3♦ (+8♥)  after drawing, bot plays a 4
 */
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
		const game = await startGame(page, 133);

		await game.play(2); // 2♠
		await game.endTurnButton.click(); // we also hold 2♥, but stop here

		await expect(game.opponentCards).toHaveCount(7, {
			timeout: BOT_DELAY,
		});
		await expectMyTurn(game);
	});

	test("the bot passes a 2 back, so the human has to pick 4 cards", async ({
		page,
	}) => {
		const game = await startGame(page, 5);

		await game.play(4); // 2♠; the bot answers with 2♥

		await expect(game.playerCards).toHaveCount(4);
		await expect(game.opponentCards).toHaveCount(4, {
			timeout: BOT_DELAY,
		});
		expect(await game.top()).toBe("2♥");
		await expect(game.discardPile).toContainText("Cards to pick: 4");
		await expectMyTurn(game);
		expect(await game.enabledIndexes()).toEqual([]);

		await game.pickCardButton.click();

		await expect(game.playerCards).toHaveCount(8);
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
		await game.endTurnButton.click(); // K♣ could follow, but stop here

		// the bot just plays 4♦ instead of drawing
		await expect(game.opponentCards).toHaveCount(4, {
			timeout: BOT_DELAY,
		});
		expect(await game.top()).toBe("4♦");
	});

	test("4 makes the bot miss its turn", async ({ page }) => {
		const game = await startGame(page, 15);

		await game.play(4); // 4♦
		await game.endTurnButton.click(); // 4♥ could follow, but stop here
		await expectBotsTurn(game);

		// the bot neither plays nor draws, and the turn comes back to us
		await expectMyTurn(game);
		await expect(game.opponentCards).toHaveCount(5);
		expect(await game.top()).toBe("4♦");
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

	test("A asks for a suit; the bot follows it and the human is then bound to the bot's call", async ({
		page,
	}) => {
		const game = await startGame(page, 33);

		await game.play(1); // A♠
		await expect(game.suitModal).toBeVisible();
		await expect(game.suitModal.getByRole("button")).toHaveText([
			"♥",
			"♦",
			"♠",
			"♣",
		]);
		await expect(game.playerCards).toHaveCount(5); // not played yet

		await game.suitModal.getByRole("button", { name: "♥" }).click();

		await expect(game.suitModal).toBeHidden();
		await expect(game.playerCards).toHaveCount(4);
		await expect(game.discardPile).toContainText("Called suit: ♥");
		// the bot follows with A♥ (a heart) and calls ♦ itself
		await expect(game.opponentCards).toHaveCount(4, {
			timeout: BOT_DELAY,
		});
		expect(await game.top()).toBe("A♥");
		await expect(game.status).toHaveText(/called ♦/);
		await expect(game.discardPile).toContainText("Called suit: ♦");
		await expectMyTurn(game);

		// we hold no ♦, so we can only pick a card, which ends the restriction
		expect(await game.enabledIndexes()).toEqual([]);
		await game.pickCardButton.click();
		await expect(game.playerCards).toHaveCount(5);
		await expect(game.discardPile).not.toContainText("Called suit", {
			timeout: BOT_DELAY,
		});
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
		await expect(game.status).toHaveText(/pick \d+ cards/i, {
			timeout: BOT_DELAY,
		});
		await expectMyTurn(game);
		await expect(game.playerCards).toHaveCount(6);
		await expect(game.missTurnButton).toBeDisabled();
		await expect(game.discardPile).toContainText("Cards to pick: 2");
		// only the two 2s in hand (2♥, 2♦) can be played to pass the penalty on
		expect(await game.enabledIndexes()).toEqual([0, 2]);

		await game.pickCardButton.click();

		await expect(game.playerCards).toHaveCount(8);
	});

	test("the human can pass a penalty back with a card of the same rank", async ({
		page,
	}) => {
		const game = await startGame(page, 1);
		await game.pickCardButton.click();
		await expect(game.status).toHaveText(/pick \d+ cards/i, {
			timeout: BOT_DELAY,
		});
		await expectMyTurn(game);

		await game.play(0); // 2♥ on the bot's 2♠
		await game.endTurnButton.click(); // 2♦ could follow, but stop here

		await expect(game.playerCards).toHaveCount(5);
		expect(await game.top()).toBe("2♥");
		await expect(game.discardPile).toContainText("Cards to pick: 4");
		// the bot has no 2 and takes both penalties: 4 + 2 + 2 cards
		await expect(game.opponentCards).toHaveCount(8, {
			timeout: BOT_DELAY,
		});
		await expectMyTurn(game);
	});

	test("after the bot plays a 4 the human can only miss the turn", async ({
		page,
	}) => {
		const game = await startGame(page, 62);
		await game.pickCardButton.click();
		await expect(game.status).toHaveText(/miss a turn/i, {
			timeout: BOT_DELAY,
		});

		await expect(game.missTurnButton).toBeEnabled();
		expect(await game.enabledIndexes()).toEqual([]);

		await game.missTurnButton.click();

		// the miss is over: the bot moves, then it's our turn again
		await expect(game.missTurnButton).toBeDisabled();
		await expect(game.status).not.toHaveText(/miss a turn/i, {
			timeout: BOT_DELAY,
		});
		await expect(game.playerCards).toHaveCount(6);
	});

	test("Pick card is usable again after missing a turn", async ({ page }) => {
		const game = await startGame(page, 62);
		await game.pickCardButton.click();
		await expect(game.status).toHaveText(/miss a turn/i, {
			timeout: BOT_DELAY,
		});
		await game.missTurnButton.click();
		await expect(game.status).not.toHaveText(/miss a turn/i, {
			timeout: BOT_DELAY,
		});

		await expectMyTurn(game);
	});

	test("Pick card is disabled while the human has to miss a turn", async ({
		page,
	}) => {
		const game = await startGame(page, 62);
		await game.pickCardButton.click();
		await expect(game.status).toHaveText(/miss a turn/i, {
			timeout: BOT_DELAY,
		});

		await expect(game.pickCardButton).toBeDisabled();
	});

	test("the bot passes a 4 back, so the human misses two turns in a row", async ({
		page,
	}) => {
		const game = await startGame(page, 8);
		await game.play(4); // 4♥; the bot answers with 4♦
		await expect(game.status).toHaveText(/miss a turn/i, {
			timeout: BOT_DELAY,
		});
		await expect(game.discardPile).toContainText("Turns to miss: 2");
		expect(await game.top()).toBe("4♦");
		expect(await game.enabledIndexes()).toEqual([]); // no 4 in hand
		await expect(game.opponentCards).toHaveCount(4);

		await game.missTurnButton.click();

		// the bot moves once, then we still have to miss another turn
		await expect(game.discardPile).toContainText("Turns to miss: 1", {
			timeout: BOT_DELAY,
		});
		await expect(game.missTurnButton).toBeEnabled();
		await game.missTurnButton.click();

		await expect(game.status).not.toHaveText(/miss a turn/i, {
			timeout: BOT_DELAY,
		});
		await expectMyTurn(game);
		await expect(game.discardPile).not.toContainText("Turns to miss");
	});

	test("the human can pass a 4 back instead of missing a turn", async ({
		page,
	}) => {
		const game = await startGame(page, 63);
		await game.pickCardButton.click();
		await expect(game.status).toHaveText(/miss a turn/i, {
			timeout: BOT_DELAY,
		});
		expect(await game.enabledIndexes()).toEqual([5]); // 4♣ on 4♥

		await game.play(5);

		await expect(game.playerCards).toHaveCount(5);
		expect(await game.top()).toBe("4♣");
		await expect(game.discardPile).toContainText("Turns to miss: 2");
		// the bot has no 4: it misses, we play, it misses again
		await expectMyTurn(game);
		await expect(game.opponentCards).toHaveCount(4);
	});
});

test.describe("game over and restart", () => {
	test("the human wins by playing the last card", async ({ page }) => {
		const game = await startGame(page, 2);
		await expect(game.gameOver).toBeHidden();
		await game.keepOnlyCard(1); // 5♣

		await game.play(0);

		await expect(game.gameOver).toContainText("You won!");
		await expect(game.playerCards).toHaveCount(0);
		await expect(game.pickCardButton).toBeDisabled();
	});

	test("the bot wins by playing its last card", async ({ page }) => {
		const game = await startGame(page, 2);
		await game.setOpponentHand([{ rank: 6, suit: "♣" }]);

		await game.play(1); // 5♣, so 6♣ is playable for the bot

		await expect(game.gameOver).toBeHidden();
		await expect(game.gameOver).toContainText("You lost", {
			timeout: BOT_DELAY,
		});
		await expect(game.opponentCards).toHaveCount(0);
		expect(await game.top()).toBe("6♣");
	});

	test("New game in the game-over dialog deals a fresh game", async ({
		page,
	}) => {
		const game = await startGame(page, 2);
		await game.keepOnlyCard(1);
		await game.play(0);
		await expect(game.gameOver).toBeVisible();

		await game.gameOver.getByRole("button", { name: "New game" }).click();
		await game.chooseRules();

		await expect(game.gameOver).toBeHidden();
		await expect(game.playerCards).toHaveCount(5);
		await expect(game.opponentCards).toHaveCount(5);
		await expect(game.pickCardButton).toBeEnabled();
		await expect(game.missTurnButton).toBeDisabled();
	});

	test("New game in the header restarts a game in progress and cancels the bot's move", async ({
		page,
	}) => {
		const game = await startGame(page, 2);
		await game.play(1); // the bot is about to answer
		await expect(game.playerCards).toHaveCount(4);

		await game.newGameButton.click();
		await game.chooseRules();

		await expect(game.playerCards).toHaveCount(5);
		await expect(game.opponentCards).toHaveCount(5);
		await expect(game.pickCardButton).toBeEnabled();
		const top = await game.top();
		await page.waitForTimeout(1500);
		await expect(game.opponentCards).toHaveCount(5);
		expect(await game.top()).toBe(top);
		await expect(game.pickCardButton).toBeEnabled();
	});
});

test.describe("table and controls", () => {
	test("has no placeholder content", async ({ page }) => {
		await startGame(page, 1);

		await expect(page.locator("body")).not.toContainText("Lorem ipsum");
		await expect(page.locator("body")).not.toContainText("game server");
	});

	test("labels the hands with their card counts", async ({ page }) => {
		const game = await startGame(page, 1);
		await expect(page.locator("#player_cards")).toContainText(
			"You · 5 cards",
		);
		await expect(page.locator("#opponent_cards")).toContainText(
			"Opponent · 5 cards",
		);

		await game.pickCardButton.click(); // we draw, the bot plays its 2♠

		await expect(page.locator("#player_cards")).toContainText(
			"You · 6 cards",
		);
		await expect(page.locator("#opponent_cards")).toContainText(
			"Opponent · 4 cards",
			{ timeout: BOT_DELAY },
		);
	});

	test("shows whose turn it is", async ({ page }) => {
		const game = await startGame(page, 2);
		await expect(game.status).toHaveText(
			"Your turn – play a card or pick one",
		);
		await expect(page.locator("#player_cards")).toHaveClass(/hand--active/);

		await game.play(1); // 5♣

		await expect(game.status).toHaveText("Opponent is thinking…");
		await expect(page.locator("#opponent_cards")).toHaveClass(
			/hand--active/,
		);
		await expect(page.locator("#player_cards")).not.toHaveClass(
			/hand--active/,
		);
		await expectMyTurn(game);
		await expect(game.status).toHaveText(/Your turn|called|pick|miss/i);
	});

	test("explains what the human has to do after the bot's call", async ({
		page,
	}) => {
		const game = await startGame(page, 33);
		await game.play(1); // A♠
		await game.suitModal.getByRole("button", { name: "♥" }).click();

		await expect(game.status).toHaveText(
			"Opponent called ♦ – play that suit or pick a card",
			{ timeout: BOT_DELAY },
		);
	});

	test("the draw pile shows the deck size and draws a card when clicked", async ({
		page,
	}) => {
		const game = await startGame(page, 2);
		await expect(game.deckButton).toContainText("Deck: 41");
		await expect(game.deckButton).toBeEnabled();

		await game.deckButton.click();

		await expect(game.playerCards).toHaveCount(6);
		await expect(game.deckButton).toContainText("Deck: 40");
		await expect(game.deckButton).toBeDisabled(); // the bot's turn
		await expectMyTurn(game);
	});

	test("the draw pile draws the whole penalty", async ({ page }) => {
		const game = await startGame(page, 1);
		await game.pickCardButton.click();
		await expect(game.status).toHaveText(/pick 2 cards/i, {
			timeout: BOT_DELAY,
		});

		await game.deckButton.click();

		await expect(game.playerCards).toHaveCount(8);
	});

	test("the rules dialog lists the card effects and can be closed", async ({
		page,
	}) => {
		const game = await startGame(page, 1);
		const dialog = page.getByRole("dialog", { name: "Rules" });
		await expect(dialog).toBeHidden();

		await game.rulesButton.click();

		await expect(dialog).toBeVisible();
		await expect(dialog).toContainText("Next player picks 2 cards");
		await expect(dialog).toContainText("You call a suit");
		await dialog.getByRole("button", { name: "Close" }).click();
		await expect(dialog).toBeHidden();

		await game.rulesButton.click();
		await expect(dialog).toBeVisible();
		await page.mouse.click(5, 5); // backdrop
		await expect(dialog).toBeHidden();
	});

	test("fits a phone screen", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		const game = await startGame(page, 1);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
		for (const locator of [
			game.playerCards.first(),
			game.playerCards.last(),
			game.pickCardButton,
			game.newGameButton,
		])
			await expect(locator).toBeInViewport();
	});
});

test.describe("playing several cards of a rank", () => {
	test("the turn stays open until the last card of the rank or End turn", async ({
		page,
	}) => {
		const game = await startGame(page, 133);

		await game.play(2); // 2♠, and 2♥ is still in hand

		await expect(game.status).toHaveText(
			"Play another 2 – or end your turn",
		);
		await expect(game.endTurnButton).toBeVisible();
		await expect(game.pickCardButton).toBeDisabled();
		await expect(game.deckButton).toBeDisabled();
		expect(await game.hand()).toEqual(["9♣", "4♣", "8♦", "2♥"]);
		expect(await game.enabledIndexes()).toEqual([3]); // only the other 2
		await expect(game.opponentCards).toHaveCount(5); // the bot waits

		await game.play(3); // 2♥ ends the turn by itself

		await expect(game.endTurnButton).toBeHidden();
		await expect(game.discardPile).toContainText("Cards to pick: 4");
		await expect(game.opponentCards).toHaveCount(9, {
			timeout: BOT_DELAY,
		});
		await expectMyTurn(game);
	});

	test("End turn keeps the remaining cards", async ({ page }) => {
		const game = await startGame(page, 133);
		await game.play(2); // 2♠

		await game.endTurnButton.click();

		await expect(game.playerCards).toHaveCount(4);
		await expect(game.opponentCards).toHaveCount(7, {
			timeout: BOT_DELAY,
		}); // only one 2 counted
		await expectMyTurn(game);
	});
});

test.describe("Macau", () => {
	test("pressing Macau when down to one card avoids a penalty", async ({
		page,
	}) => {
		const game = await startGame(page, 2);
		await game.keepCards([1, 3]); // 5♣, 10♠
		await expect(game.macauButton).toBeDisabled();

		await game.play(0); // 5♣, one card left

		await expect(game.playerCards).toHaveCount(1);
		await expect(game.status).toHaveText(
			"You have one card left – press Macau!",
		);
		await expect(game.macauButton).toBeEnabled();
		await game.macauButton.click();
		await expect(game.macauButton).toBeDisabled();

		await expectMyTurn(game);
		await expect(game.playerCards).toHaveCount(1);
		await expect(game.status).not.toContainText("forgot");
	});

	test("forgetting Macau costs two cards", async ({ page }) => {
		const game = await startGame(page, 2);
		await game.keepCards([1, 3]);

		await game.play(0);
		await expect(game.macauButton).toBeEnabled();

		await expect(game.playerCards).toHaveCount(3, { timeout: BOT_DELAY });
		await expect(game.macauButton).toBeDisabled();
		await expectMyTurn(game);
		await expect(game.status).toContainText(
			"You forgot to say Macau – you picked 2 cards.",
		);
	});

	test("shows when the bot is down to one card", async ({ page }) => {
		const game = await startGame(page, 2);

		await game.setOpponentHand([{ rank: 6, suit: "♣" }]);

		await expect(page.locator("#opponent_cards")).toContainText(
			"Opponent · 1 card – Macau!",
		);
	});
});

test.describe("bot difficulty", () => {
	test("can be chosen in the header, normal by default", async ({ page }) => {
		const game = await startGame(page, 2, "normal");
		const select = page.getByLabel("Bot difficulty");

		await expect(select.locator("option")).toHaveText([
			"easy",
			"normal",
			"hard",
		]);
		await expect(select).toHaveValue("normal");

		await select.selectOption("hard");
		await expect(select).toHaveValue("hard");
		await game.play(1); // the bot still answers
		await expectMyTurn(game);
	});

	test("a fresh page starts on normal", async ({ page }) => {
		await page.goto("/");

		await expect(page.getByLabel("Bot difficulty")).toHaveValue("normal");
	});
});
