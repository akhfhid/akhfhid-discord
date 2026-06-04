const axios = require("axios");

const DEFAULT_BASE_URL = "https://dangodeck.nett.to/api";
const VALID_RARITIES = new Set([
    "base",
    "common",
    "uncommon",
    "rare",
    "super_rare",
    "ultra_rare",
]);

class DangodeckError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = "DangodeckError";
        this.status = options.status;
        this.cause = options.cause;
    }
}

class RequestQueue {
    constructor({ maxRequests = 120, windowMs = 60_000, concurrency = 5 } = {}) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.concurrency = concurrency;
        this.pending = [];
        this.startedAt = [];
        this.active = 0;
        this.timer = null;
    }

    add(task) {
        return new Promise((resolve, reject) => {
            this.pending.push({ task, resolve, reject });
            this._pump();
        });
    }

    _pump() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const now = Date.now();
        this.startedAt = this.startedAt.filter((time) => now - time < this.windowMs);

        while (
            this.pending.length > 0 &&
            this.active < this.concurrency &&
            this.startedAt.length < this.maxRequests
        ) {
            const item = this.pending.shift();
            this.active++;
            this.startedAt.push(Date.now());

            Promise.resolve()
                .then(item.task)
                .then(item.resolve, item.reject)
                .finally(() => {
                    this.active--;
                    this._pump();
                });
        }

        if (this.pending.length > 0 && this.startedAt.length >= this.maxRequests) {
            const waitMs = Math.max(1, this.windowMs - (now - this.startedAt[0]));
            this.timer = setTimeout(() => this._pump(), waitMs);
        }
    }
}

function parsePositiveInteger(value, name, min, max) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
        throw new DangodeckError(`${name} harus berupa angka ${min}-${max}.`);
    }
    return number;
}

function calculatePower(stats) {
    const hp = Number(stats?.hp);
    const atk = Number(stats?.atk);
    const def = Number(stats?.def);
    const spd = Number(stats?.spd);

    if (![hp, atk, def, spd].every(Number.isFinite)) {
        throw new DangodeckError("Data stats tidak lengkap untuk menghitung power.");
    }

    return Math.round((hp + (atk * 1.5) + (def * 1.2) + (spd * 1.3)) * 100) / 100;
}

function stableKey(path, params) {
    const query = new URLSearchParams();
    Object.entries(params || {})
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([key, value]) => query.set(key, String(value)));
    return `${path}?${query.toString()}`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

class DangodeckClient {
    constructor(options = {}) {
        this.timeoutMs = Number(options.timeoutMs ?? process.env.DANGODECK_TIMEOUT_MS ?? 10_000);
        this.maxRetries = Number(options.maxRetries ?? process.env.DANGODECK_MAX_RETRIES ?? 3);
        this.cacheTtlMs = Number(options.cacheTtlMs ?? process.env.DANGODECK_CACHE_TTL_MS ?? 300_000);
        this.statsCacheTtlMs = Number(options.statsCacheTtlMs ?? process.env.DANGODECK_STATS_CACHE_TTL_MS ?? 60_000);
        this.cache = new Map();
        this.inFlight = new Map();
        this.queue = options.queue || new RequestQueue({
            maxRequests: Math.min(120, Math.max(1, Number(options.maxRequests ?? process.env.DANGODECK_RATE_LIMIT ?? 120))),
            windowMs: 60_000,
            concurrency: Number(options.concurrency ?? process.env.DANGODECK_CONCURRENCY ?? 5),
        });
        this.http = options.httpClient || axios.create({
            baseURL: options.baseURL || process.env.DANGODECK_API_URL || DEFAULT_BASE_URL,
            timeout: this.timeoutMs,
            headers: { Accept: "application/json" },
        });
    }

    clearCache() {
        this.cache.clear();
        this.inFlight.clear();
    }

    async getRandomCard() {
        return this._get("/cards/random", {}, 0, false);
    }

    async getCard(id) {
        const cardId = parsePositiveInteger(id, "Card ID", 1, Number.MAX_SAFE_INTEGER);
        return this._get(`/cards/${cardId}`);
    }

    async getCardStats(id, options = {}) {
        const cardId = parsePositiveInteger(id, "Card ID", 1, Number.MAX_SAFE_INTEGER);
        const rarity = String(options.rarity || "base").toLowerCase();
        if (!VALID_RARITIES.has(rarity)) {
            throw new DangodeckError(`Rarity tidak valid: ${rarity}.`);
        }

        const params = {
            rarity,
            level: parsePositiveInteger(options.level ?? 1, "Level", 1, 100),
            evo: parsePositiveInteger(options.evo ?? 1, "Evo", 1, 3),
            ascension: parsePositiveInteger(options.ascension ?? 0, "Ascension", 0, 5),
        };
        const card = await this._get(`/cards/${cardId}/stats`, params, this.statsCacheTtlMs);
        return { ...card, power: calculatePower(card.stats) };
    }

    async searchCards(query, limit = 20) {
        const q = String(query || "").trim();
        if (!q) throw new DangodeckError("Query pencarian tidak boleh kosong.");
        return this._get("/cards/search", {
            q,
            limit: parsePositiveInteger(limit, "Limit", 1, 100),
        });
    }

    async listCards(options = {}) {
        const params = {
            page: parsePositiveInteger(options.page ?? 1, "Page", 1, Number.MAX_SAFE_INTEGER),
            limit: parsePositiveInteger(options.limit ?? 20, "Limit", 1, 100),
            sort: options.sort,
            element: options.element,
            anime: options.anime,
            name: options.name,
        };
        return this._get("/cards", params);
    }

    async _get(path, params = {}, ttlMs = this.cacheTtlMs, coalesce = true) {
        const key = stableKey(path, params);
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > Date.now()) return cached.data;
        if (coalesce && this.inFlight.has(key)) return this.inFlight.get(key);

        const request = this._requestWithRetry(path, params)
            .then((data) => {
                if (ttlMs > 0) this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
                return data;
            })
            .finally(() => {
                if (coalesce) this.inFlight.delete(key);
            });

        if (coalesce) this.inFlight.set(key, request);
        return request;
    }

    async _requestWithRetry(path, params) {
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await this.queue.add(() => this.http.get(path, {
                    params,
                    timeout: this.timeoutMs,
                }));
                if (response.data?.success === false) {
                    throw new DangodeckError(response.data.message || "Dangodeck API menolak request.", {
                        status: response.status,
                    });
                }
                return response.data?.data ?? response.data;
            } catch (error) {
                lastError = error;
                if (attempt >= this.maxRetries || !this._isRetryable(error)) break;
                await sleep(this._retryDelay(error, attempt));
            }
        }

        if (lastError instanceof DangodeckError) throw lastError;
        const status = lastError?.response?.status;
        const apiMessage = lastError?.response?.data?.message || lastError?.response?.data?.error;
        const message = apiMessage || (status === 429
            ? "Rate limit Dangodeck tercapai. Coba lagi sebentar."
            : `Gagal menghubungi Dangodeck API${status ? ` (HTTP ${status})` : ""}.`);
        throw new DangodeckError(message, { status, cause: lastError });
    }

    _isRetryable(error) {
        const status = error?.response?.status || error?.status;
        return !status || status === 408 || status === 429 || status >= 500;
    }

    _retryDelay(error, attempt) {
        const headers = error?.response?.headers || {};
        const retryAfterSeconds = Number(headers["retry-after"] || headers["ratelimit-reset"]);
        if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
            return Math.min(retryAfterSeconds * 1_000, 60_000);
        }
        return Math.min(500 * (2 ** attempt), 5_000);
    }
}

const dangodeck = new DangodeckClient();

module.exports = {
    DangodeckClient,
    DangodeckError,
    RequestQueue,
    VALID_RARITIES,
    calculatePower,
    dangodeck,
};
