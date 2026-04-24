const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

class TurnstileSolver {
    constructor() {
        this.solverURL =
            process.env.CF_SOLVER_URL ||
            "https://cf-solver-renofc.my.id/api/solvebeta";
    }

    async solve(url, siteKey, mode = "turnstile-min") {
        const response = await axios.post(
            this.solverURL,
            {
                url,
                siteKey,
                mode,
            },
            {
                headers: { "Content-Type": "application/json" },
                timeout: 60000,
            }
        );

        const token =
            response?.data?.token?.result?.token ||
            response?.data?.result?.token ||
            response?.data?.token;

        if (!token || typeof token !== "string") {
            throw new Error("Turnstile token not found in solver response");
        }

        return token;
    }
}

class AIBanana {
    constructor() {
        this.baseURL = process.env.AIBANANA_BASE_URL || "https://aibanana.net";
        this.siteKey =
            process.env.AIBANANA_SITE_KEY || "0x4AAAAAAB2-fh9F_EBQqG2_";
        this.model = process.env.AIBANANA_MODEL || "nano-banana-2";
        this.aspectRatio = process.env.AIBANANA_ASPECT_RATIO || "1:1";
        this.solver = new TurnstileSolver();
    }

    generateFingerprint() {
        return crypto
            .createHash("sha256")
            .update(crypto.randomBytes(32))
            .digest("hex");
    }

    generateDeviceId() {
        return crypto.randomBytes(8).toString("hex");
    }

    generateRandomUserAgent() {
        const osList = [
            "Windows NT 10.0; Win64; x64",
            "Macintosh; Intel Mac OS X 10_15_7",
            "X11; Linux x86_64",
            "Windows NT 6.1; Win64; x64",
            "Windows NT 6.3; Win64; x64",
        ];
        const os = osList[Math.floor(Math.random() * osList.length)];
        const chromeVersion = Math.floor(Math.random() * 40) + 100;
        return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
    }

    generateRandomViewport() {
        const resolutions = [
            { w: 1366, h: 768 },
            { w: 1920, h: 1080 },
            { w: 1440, h: 900 },
            { w: 1536, h: 864 },
            { w: 1280, h: 720 },
            { w: 1600, h: 900 },
            { w: 2560, h: 1440 },
            { w: 1680, h: 1050 },
            { w: 1024, h: 768 },
        ];
        return resolutions[Math.floor(Math.random() * resolutions.length)];
    }

    generateRandomPlatform() {
        return ["Windows", "Linux", "macOS", "Chrome OS"][
            Math.floor(Math.random() * 4)
        ];
    }

    generateRandomLanguage() {
        return [
            "en-US,en;q=0.9",
            "id-ID,id;q=0.9,en-US;q=0.8",
            "en-GB,en;q=0.9",
            "es-ES,es;q=0.9",
        ][Math.floor(Math.random() * 4)];
    }

    buildImageReference(imageInput) {
        if (!imageInput) return null;

        if (/^https?:\/\//i.test(imageInput)) {
            return {
                asUrl: imageInput,
                asDataUrl: null,
            };
        }

        if (!fs.existsSync(imageInput)) {
            throw new Error(`Image file not found: ${imageInput}`);
        }

        const ext = path.extname(imageInput).toLowerCase();
        const mime =
            ext === ".png"
                ? "image/png"
                : ext === ".webp"
                ? "image/webp"
                : "image/jpeg";
        const fileBuffer = fs.readFileSync(imageInput);
        return {
            asUrl: null,
            asDataUrl: `data:${mime};base64,${fileBuffer.toString("base64")}`,
        };
    }

    async postImageGeneration({ payload, headers }) {
        try {
            const response = await axios.post(
                `${this.baseURL}/api/image-generation`,
                payload,
                {
                    headers,
                    timeout: 120000,
                }
            );
            return response.data;
        } catch (error) {
            const apiError =
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                error?.message ||
                "Unknown API error";
            const wrapped = new Error(`AIBanana API Error: ${apiError}`);
            wrapped.cause = error;
            throw wrapped;
        }
    }

    isSecurityVerificationError(error) {
        const msg = String(error?.message || "").toLowerCase();
        const status = error?.cause?.response?.status;
        return (
            msg.includes("security verification failed") ||
            msg.includes("invalid turnstile") ||
            status === 403
        );
    }

    isImageUrlsRequiredError(error) {
        const msg = String(error?.message || "").toLowerCase();
        return msg.includes("image urls are required");
    }

    async generateImage({ prompt, imageInput }) {
        if (!prompt || !String(prompt).trim()) {
            throw new Error("prompt is required");
        }

        const referenceImage = this.buildImageReference(imageInput);
        const mode = referenceImage ? "image-to-image" : "text-to-image";
        const maxAttempts = Number(process.env.AIBANANA_MAX_RETRIES || 3);
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const turnstileToken = await this.solver.solve(
                this.baseURL,
                this.siteKey,
                "turnstile-min"
            );
            const fingerprint = this.generateFingerprint();
            const deviceId = this.generateDeviceId();
            const userAgent = this.generateRandomUserAgent();
            const viewport = this.generateRandomViewport();
            const platform = this.generateRandomPlatform();
            const language = this.generateRandomLanguage();
            const chromeVersion = Math.floor(Math.random() * 30) + 110;

            const basePayload = {
                prompt: String(prompt),
                model: this.model,
                mode,
                numImages: 1,
                aspectRatio: this.aspectRatio,
                clientFingerprint: fingerprint,
                turnstileToken,
                deviceId,
            };

            if (referenceImage?.asUrl) {
                basePayload.imageUrls = [referenceImage.asUrl];
                basePayload.image_urls = [referenceImage.asUrl];
                basePayload.imageUrl = referenceImage.asUrl;
                basePayload.referenceImageUrl = referenceImage.asUrl;
                basePayload.inputImageUrl = referenceImage.asUrl;
            } else if (referenceImage?.asDataUrl) {
                basePayload.image = referenceImage.asDataUrl;
                basePayload.imageUrl = referenceImage.asDataUrl;
                basePayload.inputImage = referenceImage.asDataUrl;
                basePayload.referenceImage = referenceImage.asDataUrl;
                basePayload.image_input = [referenceImage.asDataUrl];
            }

            const headers = {
                "Content-Type": "application/json",
                Accept: "*/*",
                "Accept-Language": language,
                Origin: this.baseURL,
                Referer: `${this.baseURL}/`,
                "User-Agent": userAgent,
                "Sec-Ch-Ua": `"Chromium";v="${chromeVersion}", "Not-A.Brand";v="24", "Google Chrome";v="${chromeVersion}"`,
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": `"${platform}"`,
                "Viewport-Width": String(viewport.w),
                "Viewport-Height": String(viewport.h),
                "X-Forwarded-For": `${Math.floor(
                    Math.random() * 255
                )}.${Math.floor(Math.random() * 255)}.${Math.floor(
                    Math.random() * 255
                )}.${Math.floor(Math.random() * 255)}`,
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
            };

            const payloadVariants = [basePayload];
            if (referenceImage?.asUrl) {
                payloadVariants.push({
                    ...basePayload,
                    imageUrls: [referenceImage.asUrl],
                    image_urls: [referenceImage.asUrl],
                    image_input: [referenceImage.asUrl],
                    image: referenceImage.asUrl,
                    imageUrl: referenceImage.asUrl,
                    inputImage: referenceImage.asUrl,
                    referenceImage: referenceImage.asUrl,
                });
            }

            for (const payload of payloadVariants) {
                try {
                    return await this.postImageGeneration({ payload, headers });
                } catch (error) {
                    lastError = error;

                    if (this.isSecurityVerificationError(error)) {
                        // Token/challenge rejected, refresh on next outer attempt.
                        break;
                    }

                    if (this.isImageUrlsRequiredError(error)) {
                        // Try another payload variant in same attempt.
                        continue;
                    }

                    throw error;
                }
            }

            if (attempt < maxAttempts) {
                await sleep(500 + attempt * 250);
            }
        }

        throw lastError || new Error("AIBanana API Error: unknown failure");
    }
}

async function nanobanana(input) {
    const prompt = input?.prompt;
    const imageInput = input?.imagePath || input?.imageUrl;

    const banana = new AIBanana();
    return banana.generateImage({ prompt, imageInput });
}

module.exports = nanobanana;
