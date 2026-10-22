import { Page, expect, test } from "@playwright/test";
import { Game, expectBotsTurn, expectMyTurn, startGame } from "./support/game";

/*
 * The seeds are explained in macau.spec.ts; these are the ones used here:
 *
 *   seed  top  human hand            notes
 *   1     8♠   2♥ J♣ 2♦ A♣ 5♣        no playable card
 *   2     5♦   3♦ 5♣ J♦ 10♠ 9♠       3♦, 5♣, J♦ playable
 *   3     5♥   Q♠ 9♣ K♥ 10♥ 4♠       K♥ playable
 *   5     6♠   6♥ 9♠ K♣ 8♠ 2♠        2♠ playable; the bot passes it back with 2♥
 */

test.describe("optional rules", () => {
	test("the setup dialog opens first, with every optional rule off", async ({
		page,
	}) => {
		await page.goto("/");
		const game = new Game(page);

		await expect(game.setupDialog).toBeVisible();
		for (const box of await game.setupDialog.getByRole("checkbox").all())
			await expect(box).not.toBeChecked();
	});

	test("New game asks again and remembers the last choice", async ({
		page,
	}) => {
		const game = await startGame(page, 3, "easy", ["Queen"]);

		await game.newGameButton.click();

		await expect(game.setupDialog.getByLabel("Queen")).toBeChecked();
	});

	test("without the Queen rule a Queen needs a matching card", async ({
		page,
	}) => {
		const game = await startGame(page, 3);

		expect(await game.top()).toBe("5♥");
		expect(await game.hand()).toContain("Q♠");
		expect(await game.enabledIndexes()).toEqual([2, 3]); // K♥, 10♥
	});

	test("with the Queen rule a Queen goes on any card", async ({ page }) => {
		const game = await startGame(page, 3, "easy", ["Queen"]);

		await game.expectEnabled([0, 2, 3]); // Q♠, K♥, 10♥
		await game.play(0);

		await game.expectTop("Q♠");
		await game.rulesButton.click();
		await expect(page.getByRole("dialog", { name: "Rules" })).toContainText(
			"Optional rules in this game",
		);
	});

	test("with the Queen rule a Queen cancels a penalty", async ({ page }) => {
		const game = await startGame(page, 5, "easy", ["Queen"]);
		await game.giveCard(12, "♣"); // shown as "12♣": the helper's fake rank has no letter
		const queen = (await game.hand()).indexOf("12♣");

		await game.play(await game.indexOf((label) => label === "2♠")); // the bot passes it back with 2♥
		await expectMyTurn(game);
		await expect(game.status).toContainText("cancel it with a Q");
		await game.play(queen);

		await expectBotsTurn(game);
		await game.expectTop("12♣");
	});

	test("with Binding Jack the player has to play the called rank after the opponent", async ({
		page,
	}) => {
		const game = await startGame(page, 2, "easy", ["Binding Jack"]);
		await game.setOpponentHand([
			{ rank: 7, suit: "♣" },
			{ rank: 8, suit: "♣" },
		]);
		await game.giveCard(7, "♥");

		await game.play(2); // J♦
		await game.rankModal.getByRole("button", { name: "7" }).click();

		await expectMyTurn(game); // the bot played 7♣
		await game.expectTop("7♣");
		await expect(game.status).toContainText("You called 7");
		const seven = await game.indexOf((label) => label === "7♥");
		await game.expectEnabled([seven]);
		await game.play(seven);

		await expectBotsTurn(game);
		await game.expectTop("7♥");
	});

	test("with Stacking penalties a 3 can be played on a 2", async ({
		page,
	}) => {
		const game = await startGame(page, 5, "easy", ["Stacking penalties"]);
		await game.setOpponentHand([
			{ rank: 3, suit: "♣" },
			{ rank: 5, suit: "♣" },
		]);
		await game.giveCard(3, "♦");

		await game.play(await game.indexOf((label) => label === "2♠"));

		await expectMyTurn(game); // the bot answered with 3♣
		await game.expectTop("3♣");
		await expect(game.status).toContainText("Pick 5 cards");
		const three = await game.indexOf((label) => label === "3♦");
		await game.expectEnabled([three]);
		await game.play(three);

		await expectBotsTurn(game);
		await game.expectTop("3♦");
	});

	test("with No finishing on an action card the last card can't be a 2", async ({
		page,
	}) => {
		const game = await startGame(page, 5, "easy", [
			"No finishing on an action card",
		]);
		await game.keepOnlyCard(4); // 2♠, playable on 6♠ otherwise

		await expect(game.playerCards).toHaveCount(1);
		await expect(game.playerCards.first().locator(".card")).toHaveClass(
			/card--disabled/,
		);
		await game.play(0);
		await expect(game.gameOver).toBeHidden();
		await expect(game.playerCards).toHaveCount(1);

		await game.pickCardButton.click();
		await expect(game.playerCards).toHaveCount(2);
	});

	test("without it the same 2 wins the game", async ({ page }) => {
		const game = await startGame(page, 5);
		await game.keepOnlyCard(4);

		await game.play(0);

		await expect(game.gameOver).toContainText("You won!");
	});

	test.describe("with Playing the drawn card", () => {
		// seed 1: nothing is playable on 8♠; the next card is an 8♦, which is playable
		const start = async (page: Page) => {
			const game = await startGame(page, 1, "easy", [
				"Playing the drawn card",
			]);
			await game.setNextCard(8, "♦");
			await game.pickCardButton.click();
			await expect(game.status).toContainText("You picked 8♦");
			return game;
		};

		test("the picked card can be played", async ({ page }) => {
			const game = await start(page);
			await expect(game.playerCards).toHaveCount(6);
			await expect(game.pickCardButton).toBeDisabled();
			await game.expectEnabled([5]);

			await game.play(5);

			await game.expectTop("8♦");
			await expect(game.playerCards).toHaveCount(5);
			await expectBotsTurn(game);
		});

		test("the turn can be ended to keep it", async ({ page }) => {
			const game = await start(page);

			await game.endTurnButton.click();

			await expect(game.playerCards).toHaveCount(6);
			await expect(game.endTurnButton).toBeHidden();
			await expectBotsTurn(game);
		});
	});
});
