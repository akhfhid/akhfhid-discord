const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("os");
const path = require("path");
const { DangodeckClient, DangodeckError, calculatePower } = require("../utils/dangodeck");
const { CardGame, CardGameError } = require("../utils/cardGame");

function immediateQueue() {
    return { add: (task) => task() };
}

test("calculatePower follows the Dangodeck formula", () => {
    assert.equal(calculatePower({ hp: 100, atk: 20, def: 10, spd: 5 }), 148.5);
});

test("getCardStats validates progression and adds power", async () => {
    const client = new DangodeckClient({
        queue: immediateQueue(),
        maxRetries: 0,
        httpClient: {
            get: async () => ({
                data: { success: true, data: { id: 1, stats: { hp: 100, atk: 20, def: 10, spd: 5 } } },
            }),
        },
    });

    const card = await client.getCardStats(1, { rarity: "rare", level: 50, evo: 2, ascension: 3 });
    assert.equal(card.power, 148.5);
    await assert.rejects(() => client.getCardStats(1, { level: 101 }), DangodeckError);
});

test("detail responses are cached and concurrent requests are coalesced", async () => {
    let calls = 0;
    const client = new DangodeckClient({
        queue: immediateQueue(),
        maxRetries: 0,
        httpClient: {
            get: async () => {
                calls++;
                return { data: { success: true, data: { id: 1 } } };
            },
        },
    });

    await Promise.all([client.getCard(1), client.getCard(1)]);
    await client.getCard(1);
    assert.equal(calls, 1);
});

test("random pulls are never cached or coalesced", async () => {
    let calls = 0;
    const client = new DangodeckClient({
        queue: immediateQueue(),
        maxRetries: 0,
        httpClient: {
            get: async () => ({ data: { success: true, data: { id: ++calls } } }),
        },
    });

    const cards = await Promise.all([client.getRandomCard(), client.getRandomCard()]);
    assert.deepEqual(cards.map((card) => card.id), [1, 2]);
});

test("retryable API failures are retried", async () => {
    let calls = 0;
    const client = new DangodeckClient({
        queue: immediateQueue(),
        maxRetries: 1,
        httpClient: {
            get: async () => {
                calls++;
                if (calls === 1) {
                    const error = new Error("temporary");
                    error.response = { status: 500, headers: {} };
                    throw error;
                }
                return { data: { success: true, data: { id: 2 } } };
            },
        },
    });

    assert.equal((await client.getCard(2)).id, 2);
    assert.equal(calls, 2);
});

function createGame() {
    const dataPath = path.join(os.tmpdir(), `card-game-${process.pid}-${Math.random()}.json`);
    const api = {
        getRandomCard: async () => ({
            id: 1,
            name: "Test Card",
            anime: "Test Anime",
            element: "Fire",
            image: "https://example.com/card.png",
            params: { rarity: "rare", level: 1, evo: 1, ascension: 0 },
        }),
        getCardStats: async (id, card) => ({
            id,
            name: card.name,
            stats: { hp: 100, atk: 100, def: 100, spd: 100 },
            power: 500,
        }),
    };
    return new CardGame({ dataPath, api });
}

test("card game supports multiple configured channels", () => {
    const game = createGame();
    assert.throws(() => game.requireActiveChannel("guild", "channel"), CardGameError);
    game.getGuild("guild").channelId = "legacy-channel";
    game.setChannel("guild", "first-channel");
    game.setChannel("guild", "second-channel");
    assert.deepEqual(game.getChannelIds("guild"), ["legacy-channel", "first-channel", "second-channel"]);
    assert.doesNotThrow(() => game.requireActiveChannel("guild", "legacy-channel"));
    assert.doesNotThrow(() => game.requireActiveChannel("guild", "first-channel"));
    assert.doesNotThrow(() => game.requireActiveChannel("guild", "second-channel"));
    assert.throws(() => game.requireActiveChannel("guild", "other-channel"), CardGameError);
    game.disableChannel("guild", "first-channel");
    assert.deepEqual(game.getChannelIds("guild"), ["legacy-channel", "second-channel"]);
});

test("gacha stores a unique card and consumes a ticket", async () => {
    const game = createGame();
    const player = game.getPlayer("guild", "user");
    const card = game.addCard("guild", "user", await game.api.getRandomCard());
    assert.equal(player.tickets, 4);
    assert.equal(player.cards[0].instanceId, card.instanceId);
});

test("daily, progression, battle, raid, and market persist game state", async () => {
    const game = createGame();
    const first = game.getPlayer("guild", "first");
    const second = game.getPlayer("guild", "second");
    game.addCard("guild", "first", await game.api.getRandomCard());
    game.addCard("guild", "second", await game.api.getRandomCard());

    const daily = game.claimDaily("guild", "first", 1_000_000_000);
    assert.equal(daily.tickets, 3);
    assert.throws(() => game.claimDaily("guild", "first", 1_000_000_001), CardGameError);

    first.gold = 100_000;
    first.materials = 10_000;
    const upgraded = game.upgrade("guild", "first", first.cards[0].instanceId, 10);
    assert.equal(upgraded.card.level, 11);

    const battle = await game.battle("guild", "first", "second", 2_000_000_000, () => 0.5);
    assert.equal(battle.winnerId, "first");

    const raid = await game.raid("guild", "first", 3_000_000_000, () => 0.5);
    assert.equal(raid.damage, 500);
    const scheduledRaid = await game.startRaid("guild", 4_000_000_000, true);
    assert.equal(scheduledRaid.hp, 50000);
    assert.deepEqual(scheduledRaid.contributors, {});

    const listing = game.sell("guild", "first", first.cards[0].instanceId, 500);
    second.gold = 1000;
    game.buy("guild", "second", listing.listingId);
    assert.equal(second.cards.some((card) => card.instanceId === listing.card.instanceId), true);
});
