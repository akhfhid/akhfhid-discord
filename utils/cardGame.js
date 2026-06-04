const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { dangodeck, calculatePower } = require("./dangodeck");

const DEFAULT_DATA_PATH = path.join(__dirname, "..", "data", "cardGame.json");
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const BATTLE_COOLDOWN_MS = 5 * 60 * 1000;
const RAID_COOLDOWN_MS = 15 * 1000;
const RARITIES = ["base", "common", "uncommon", "rare", "super_rare", "ultra_rare"];
const RARITY_RANK = Object.fromEntries(RARITIES.map((rarity, index) => [rarity, index]));

class CardGameError extends Error {
    constructor(message) {
        super(message);
        this.name = "CardGameError";
    }
}

class CardGame {
    constructor(options = {}) {
        this.dataPath = options.dataPath || DEFAULT_DATA_PATH;
        this.api = options.api || dangodeck;
        this.data = this._load();
    }

    _load() {
        if (!fs.existsSync(this.dataPath)) return { guilds: {} };
        try {
            const data = JSON.parse(fs.readFileSync(this.dataPath, "utf8"));
            return data?.guilds ? data : { guilds: {} };
        } catch (error) {
            console.error("Failed to load card game data:", error?.message || error);
            return { guilds: {} };
        }
    }

    _save() {
        fs.mkdirSync(path.dirname(this.dataPath), { recursive: true });
        const tempPath = `${this.dataPath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), "utf8");
        fs.renameSync(tempPath, this.dataPath);
    }

    getGuild(guildId, create = true) {
        if (!this.data.guilds[guildId] && create) {
            this.data.guilds[guildId] = { channelIds: [], players: {}, market: [], raid: null };
        }
        return this.data.guilds[guildId];
    }

    setChannel(guildId, channelId) {
        const guild = this.getGuild(guildId);
        guild.channelIds = this.getChannelIds(guildId);
        if (!guild.channelIds.includes(channelId)) guild.channelIds.push(channelId);
        delete guild.channelId;
        this._save();
    }

    disableChannel(guildId, channelId = null) {
        const guild = this.getGuild(guildId);
        guild.channelIds = channelId
            ? this.getChannelIds(guildId).filter((id) => id !== channelId)
            : [];
        delete guild.channelId;
        this._save();
    }

    getChannelIds(guildId) {
        const guild = this.getGuild(guildId, false);
        if (!guild) return [];
        const channelIds = Array.isArray(guild.channelIds) ? [...guild.channelIds] : [];
        if (guild.channelId) channelIds.push(guild.channelId);
        return [...new Set(channelIds.filter(Boolean))];
    }

    getGuildIds() {
        return Object.keys(this.data.guilds);
    }

    getChannelId(guildId) {
        return this.getChannelIds(guildId)[0] || null;
    }

    requireActiveChannel(guildId, channelId) {
        const activeChannelIds = this.getChannelIds(guildId);
        if (!activeChannelIds.length) {
            throw new CardGameError("Card game belum diaktifkan oleh admin di server ini.");
        }
        if (!activeChannelIds.includes(channelId)) {
            throw new CardGameError(`Card game hanya bisa dipakai di ${activeChannelIds.map((id) => `<#${id}>`).join(", ")}.`);
        }
    }

    getPlayer(guildId, userId, create = true) {
        const guild = this.getGuild(guildId, create);
        if (!guild) return null;
        if (!guild.players[userId] && create) {
            guild.players[userId] = {
                gold: 1000,
                tickets: 5,
                materials: 100,
                cards: [],
                dailyAt: 0,
                battleAt: 0,
                raidAt: 0,
                wins: 0,
                losses: 0,
            };
            this._save();
        }
        return guild.players[userId] || null;
    }

    addCard(guildId, userId, apiCard) {
        const player = this.getPlayer(guildId, userId);
        if (player.tickets < 1) throw new CardGameError("Ticket gacha habis. Ambil `!daily` terlebih dahulu.");
        const instance = {
            instanceId: crypto.randomUUID().split("-")[0],
            cardId: apiCard.id,
            name: apiCard.name,
            anime: apiCard.anime,
            element: apiCard.element,
            image: apiCard.image,
            rarity: apiCard.params?.rarity || "base",
            level: apiCard.params?.level || 1,
            evo: apiCard.params?.evo || 1,
            ascension: apiCard.params?.ascension || 0,
            obtainedAt: Date.now(),
        };
        player.tickets--;
        player.cards.push(instance);
        this._save();
        return instance;
    }

    gachaWithGold(guildId, userId, apiCard) {
        const GACHA_GOLD_COST = 200;
        const player = this.getPlayer(guildId, userId);
        if (player.gold < GACHA_GOLD_COST) {
            throw new CardGameError(`Gold tidak cukup. Butuh ${GACHA_GOLD_COST} gold untuk gacha, kamu hanya punya ${player.gold} gold.`);
        }
        const instance = {
            instanceId: crypto.randomUUID().split("-")[0],
            cardId: apiCard.id,
            name: apiCard.name,
            anime: apiCard.anime,
            element: apiCard.element,
            image: apiCard.image,
            rarity: apiCard.params?.rarity || "base",
            level: apiCard.params?.level || 1,
            evo: apiCard.params?.evo || 1,
            ascension: apiCard.params?.ascension || 0,
            obtainedAt: Date.now(),
        };
        player.gold -= GACHA_GOLD_COST;
        player.cards.push(instance);
        this._save();
        return instance;
    }

    findCard(guildId, userId, instanceId) {
        const player = this.getPlayer(guildId, userId);
        const query = String(instanceId || "").toLowerCase();
        const exact = player.cards.find((card) => card.instanceId.toLowerCase() === query);
        const partial = player.cards.filter((card) => card.instanceId.toLowerCase().startsWith(query));
        const card = exact || (partial.length === 1 ? partial[0] : null);
        if (!card) throw new CardGameError("Kartu inventory tidak ditemukan. Gunakan instance ID dari `!inventory`.");
        return card;
    }

    async hydrateCard(card) {
        return this.api.getCardStats(card.cardId, card);
    }

    async strongestCard(guildId, userId) {
        const player = this.getPlayer(guildId, userId);
        if (!player.cards.length) throw new CardGameError("Inventory kartu masih kosong.");
        const hydrated = await Promise.all(player.cards.map(async (card) => ({
            instance: card,
            stats: await this.hydrateCard(card),
        })));
        return hydrated.sort((left, right) => right.stats.power - left.stats.power)[0];
    }

    claimDaily(guildId, userId, now = Date.now()) {
        const player = this.getPlayer(guildId, userId);
        const remaining = DAILY_COOLDOWN_MS - (now - player.dailyAt);
        if (player.dailyAt && remaining > 0) {
            throw new CardGameError(`Daily sudah diambil. Coba lagi dalam ${formatDuration(remaining)}.`);
        }
        const reward = { gold: 750, tickets: 3, materials: 75 };
        player.gold += reward.gold;
        player.tickets += reward.tickets;
        player.materials += reward.materials;
        player.dailyAt = now;
        this._save();
        return reward;
    }

    upgrade(guildId, userId, instanceId, levels = 1) {
        const player = this.getPlayer(guildId, userId);
        const card = this.findCard(guildId, userId, instanceId);
        const amount = Number(levels);
        if (!Number.isInteger(amount) || amount < 1 || amount > 10) {
            throw new CardGameError("Jumlah level harus 1-10.");
        }
        if (card.level + amount > 100) throw new CardGameError("Level kartu maksimal 100.");
        const goldCost = Array.from({ length: amount }, (_, i) => (card.level + i) * 25).reduce((a, b) => a + b, 0);
        const materialCost = amount * 10;
        this._requireBalance(player, goldCost, materialCost);
        player.gold -= goldCost;
        player.materials -= materialCost;
        card.level += amount;
        this._save();
        return { card, goldCost, materialCost };
    }

    evolve(guildId, userId, instanceId) {
        const player = this.getPlayer(guildId, userId);
        const card = this.findCard(guildId, userId, instanceId);
        if (card.evo >= 3) throw new CardGameError("Evo kartu sudah maksimal.");
        const requiredLevel = card.evo === 1 ? 30 : 70;
        if (card.level < requiredLevel) throw new CardGameError(`Evo berikutnya membutuhkan level ${requiredLevel}.`);
        const goldCost = card.evo * 2500;
        const materialCost = card.evo * 150;
        this._requireBalance(player, goldCost, materialCost);
        player.gold -= goldCost;
        player.materials -= materialCost;
        card.evo++;
        this._save();
        return { card, goldCost, materialCost };
    }

    ascend(guildId, userId, instanceId) {
        const player = this.getPlayer(guildId, userId);
        const card = this.findCard(guildId, userId, instanceId);
        if (card.ascension >= 5) throw new CardGameError("Ascension kartu sudah maksimal.");
        if (card.level < 50) throw new CardGameError("Ascension membutuhkan level minimal 50.");
        const goldCost = (card.ascension + 1) * 2000;
        const materialCost = (card.ascension + 1) * 100;
        this._requireBalance(player, goldCost, materialCost);
        player.gold -= goldCost;
        player.materials -= materialCost;
        card.ascension++;
        this._save();
        return { card, goldCost, materialCost };
    }

    async battle(guildId, attackerId, defenderId, now = Date.now(), random = Math.random) {
        if (attackerId === defenderId) throw new CardGameError("Kamu tidak bisa battle melawan diri sendiri.");
        const attacker = this.getPlayer(guildId, attackerId);
        const defender = this.getPlayer(guildId, defenderId, false);
        if (!defender) throw new CardGameError("Lawan belum pernah bermain card game.");
        const remaining = BATTLE_COOLDOWN_MS - (now - attacker.battleAt);
        if (attacker.battleAt && remaining > 0) throw new CardGameError(`Battle cooldown ${formatDuration(remaining)}.`);

        const [left, right] = await Promise.all([
            this.strongestCard(guildId, attackerId),
            this.strongestCard(guildId, defenderId),
        ]);
        
        // Battle logic dengan multiple factors
        const rarityScore = { "base": 1, "common": 1.2, "uncommon": 1.5, "rare": 2, "super_rare": 2.5, "ultra_rare": 3 };
        const leftRarityMult = rarityScore[left.instance.rarity] || 1;
        const rightRarityMult = rarityScore[right.instance.rarity] || 1;
        
        // Factor yang mempengaruhi: power, level, evo, rarity, plus randomness
        const leftPowerFactor = left.stats.power * leftRarityMult * (1 + left.instance.level / 100) * (1 + left.instance.evo * 0.15);
        const rightPowerFactor = right.stats.power * rightRarityMult * (1 + right.instance.level / 100) * (1 + right.instance.evo * 0.15);
        
        // Element advantage (simple system)
        const leftElementBoost = random() > 0.6 ? 1.2 : 1; // 40% chance boost
        const rightElementBoost = random() > 0.6 ? 1.2 : 1;
        
        // Final scores dengan randomness
        const leftScore = leftPowerFactor * leftElementBoost * (0.85 + random() * 0.3);
        const rightScore = rightPowerFactor * rightElementBoost * (0.85 + random() * 0.3);
        
        const winnerId = leftScore >= rightScore ? attackerId : defenderId;
        const winnerCard = leftScore >= rightScore ? left : right;
        const loserCard = leftScore >= rightScore ? right : left;
        
        const loserId = winnerId === attackerId ? defenderId : attackerId;
        const winner = this.getPlayer(guildId, winnerId);
        const loser = this.getPlayer(guildId, loserId);
        winner.gold += 300;
        winner.materials += 20;
        winner.wins++;
        loser.losses++;
        attacker.battleAt = now;
        this._save();
        
        return { 
            winnerId, 
            left, 
            right, 
            leftScore: Math.round(leftScore), 
            rightScore: Math.round(rightScore),
            winnerCard,
            loserCard,
            battleFactors: {
                winnerRarity: winnerCard.instance.rarity,
                winnerLevel: winnerCard.instance.level,
                winnerEvo: winnerCard.instance.evo,
                winnerElement: winnerCard.instance.element,
                loserRarity: loserCard.instance.rarity,
                loserLevel: loserCard.instance.level,
                loserEvo: loserCard.instance.evo,
                loserElement: loserCard.instance.element
            }
        };
    }

    async startRaid(guildId, now = Date.now(), force = false) {
        const guild = this.getGuild(guildId);
        if (!force && guild.raid && guild.raid.hp > 0 && now - guild.raid.createdAt <= DAILY_COOLDOWN_MS) {
            return guild.raid;
        }

        const bossCard = await this.api.getRandomCard();
        const difficultyRoll = Math.random();
        let difficulty, maxHp;
        
        // Difficulty berdasarkan random: Easy (50%), Normal (35%), Hard (15%)
        if (difficultyRoll < 0.5) {
            difficulty = "Easy";
            maxHp = 30000;
        } else if (difficultyRoll < 0.85) {
            difficulty = "Normal";
            maxHp = 50000;
        } else {
            difficulty = "Hard";
            maxHp = 75000;
        }
        
        guild.raid = {
            cardId: bossCard.id,
            name: bossCard.name,
            image: bossCard.image,
            element: bossCard.element,
            difficulty: difficulty,
            maxHp: maxHp,
            hp: maxHp,
            createdAt: now,
            contributors: {},
        };
        this._save();
        return guild.raid;
    }

    async raid(guildId, userId, now = Date.now(), random = Math.random) {
        const guild = this.getGuild(guildId);
        const player = this.getPlayer(guildId, userId);
        
        // Cek apakah jam sekarang adalah jam 8 malam (event raid)
        const currentHour = new Date(now).getHours();
        if (currentHour !== 20) {
            const nextRaidHour = currentHour < 20 ? 20 : 20 + 24;
            const hoursUntilRaid = (nextRaidHour - currentHour) % 24;
            throw new CardGameError(`⏰ Event raid hanya tersedia jam 8 malam. Coba lagi dalam ${hoursUntilRaid} jam.`);
        }
        
        const remaining = RAID_COOLDOWN_MS - (now - player.raidAt);
        if (player.raidAt && remaining > 0) throw new CardGameError(`Raid attack cooldown ${formatDuration(remaining)}.`);
        if (!player.cards.length) throw new CardGameError("Inventory kartu masih kosong.");

        await this.startRaid(guildId, now);

        const strongest = await this.strongestCard(guildId, userId);
        const damage = Math.max(1, Math.round(strongest.stats.power * (0.8 + random() * 0.4)));
        guild.raid.hp = Math.max(0, guild.raid.hp - damage);
        guild.raid.contributors[userId] = (guild.raid.contributors[userId] || 0) + damage;
        player.raidAt = now;

        let rewards = null;
        if (guild.raid.hp === 0) {
            rewards = {};
            const difficultyMultiplier = guild.raid.difficulty === "Easy" ? 0.8 : guild.raid.difficulty === "Hard" ? 1.5 : 1;
            
            for (const [contributorId, contribution] of Object.entries(guild.raid.contributors)) {
                const contributor = this.getPlayer(guildId, contributorId);
                const share = contribution / guild.raid.maxHp;
                
                const baseGold = Math.max(250, Math.round(5000 * share * difficultyMultiplier));
                const baseMaterial = Math.max(25, Math.round(500 * share * difficultyMultiplier));
                
                const reward = {
                    gold: Math.round(baseGold),
                    materials: Math.round(baseMaterial),
                    tickets: share >= 0.1 ? 1 : 0,
                };
                contributor.gold += reward.gold;
                contributor.materials += reward.materials;
                contributor.tickets += reward.tickets;
                rewards[contributorId] = reward;
            }
        }
        this._save();
        return { boss: guild.raid, strongest, damage, rewards };
    }

    listMarket(guildId) {
        return this.getGuild(guildId).market;
    }

    sell(guildId, userId, instanceId, price) {
        const guild = this.getGuild(guildId);
        const player = this.getPlayer(guildId, userId);
        const card = this.findCard(guildId, userId, instanceId);
        const amount = Number(price);
        if (!Number.isInteger(amount) || amount < 100 || amount > 10_000_000) {
            throw new CardGameError("Harga market harus 100-10.000.000 gold.");
        }
        player.cards = player.cards.filter((item) => item.instanceId !== card.instanceId);
        const listing = {
            listingId: crypto.randomUUID().split("-")[0],
            sellerId: userId,
            price: amount,
            card,
            createdAt: Date.now(),
        };
        guild.market.push(listing);
        this._save();
        return listing;
    }

    buy(guildId, userId, listingId) {
        const guild = this.getGuild(guildId);
        const index = guild.market.findIndex((item) => item.listingId.startsWith(String(listingId || "")));
        if (index < 0) throw new CardGameError("Listing market tidak ditemukan.");
        const listing = guild.market[index];
        if (listing.sellerId === userId) throw new CardGameError("Kamu tidak bisa membeli listing sendiri.");
        const buyer = this.getPlayer(guildId, userId);
        const seller = this.getPlayer(guildId, listing.sellerId);
        if (buyer.gold < listing.price) throw new CardGameError("Gold tidak cukup untuk membeli kartu ini.");
        buyer.gold -= listing.price;
        seller.gold += Math.round(listing.price * 0.95);
        buyer.cards.push(listing.card);
        guild.market.splice(index, 1);
        this._save();
        return listing;
    }

    cancelListing(guildId, userId, listingId) {
        const guild = this.getGuild(guildId);
        const index = guild.market.findIndex((item) => item.listingId.startsWith(String(listingId || "")));
        if (index < 0) throw new CardGameError("Listing market tidak ditemukan.");
        const listing = guild.market[index];
        if (listing.sellerId !== userId) throw new CardGameError("Kamu bukan pemilik listing ini.");
        this.getPlayer(guildId, userId).cards.push(listing.card);
        guild.market.splice(index, 1);
        this._save();
        return listing;
    }

    _requireBalance(player, gold, materials) {
        if (player.gold < gold) throw new CardGameError(`Gold tidak cukup. Dibutuhkan ${gold.toLocaleString("id-ID")} gold.`);
        if (player.materials < materials) throw new CardGameError(`Material tidak cukup. Dibutuhkan ${materials.toLocaleString("id-ID")} material.`);
    }
}

function formatDuration(ms) {
    const seconds = Math.ceil(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hours && `${hours}j`, minutes && `${minutes}m`, secs && `${secs}d`].filter(Boolean).join(" ");
}

const cardGame = new CardGame();

module.exports = { CardGame, CardGameError, RARITIES, RARITY_RANK, cardGame, formatDuration };
