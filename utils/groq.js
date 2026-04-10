const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

class Groq {
    constructor() {
        const ip = [
            10,
            crypto.randomInt(256),
            crypto.randomInt(256),
            crypto.randomInt(256),
        ].join(".");

        this.inst = axios.create({
            baseURL: "https://g4f.space/api/groq",
            headers: {
                origin: "https://g4f.dev",
                referer: "https://g4f.dev/",
                "user-agent":
                    "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
                "x-forwarded-for": ip,
                "x-originating-ip": ip,
                "x-remote-ip": ip,
                "x-remote-addr": ip,
                "x-forwarded-host": ip,
                "x-connecting-ip": ip,
                "client-ip": ip,
                "x-client-ip": ip,
                "x-real-ip": ip,
                "x-forwarded-for-original": ip,
                "x-forwarded": ip,
                "x-cluster-client-ip": ip,
                "x-original-forwarded-for": ip,
            },
            timeout: Number(process.env.GROQ_TIMEOUT_MS || 60000),
        });
    }

    async models() {
        try {
            const { data } = await this.inst.get("/models");
            return data?.data || [];
        } catch (error) {
            throw new Error(error?.message || "Failed to fetch models");
        }
    }

    async chat({ messages, model = "groq/compound-mini", ...conf } = {}) {
        try {
            if (!Array.isArray(messages)) {
                throw new Error("Messages array is required.");
            }

            const models = await this.models();
            const modelIds = models.map((m) => m.id);
            if (!modelIds.includes(model)) {
                throw new Error("Model not found.");
            }

            const { data } = await this.inst.post("/chat/completions", {
                messages,
                model,
                ...conf,
            });

            return data;
        } catch (error) {
            throw new Error(error?.message || "Groq chat failed");
        }
    }
}

module.exports = Groq;
