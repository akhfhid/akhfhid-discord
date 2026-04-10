const claude = require("./claude");
const Groq = require("./groq");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const sessionHistory = new Map();
const SESSION_BLOCKED_PREFIXES = ["system-", "schedule-"];
const SESSION_FILE =
    process.env.AI_SESSION_FILE ||
    path.join(__dirname, "..", "data", "ai_sessions.json");
const SAVE_DEBOUNCE_MS = Number(process.env.AI_SESSION_SAVE_MS || 2000);
let saveTimer = null;

function sessionsEnabled() {
    return (process.env.AI_SESSION_ENABLED || "true").toLowerCase() !== "false";
}

function isSessionEligible(sessionId) {
    if (!sessionsEnabled()) return false;
    if (!sessionId) return false;
    const id = String(sessionId);
    return !SESSION_BLOCKED_PREFIXES.some((p) => id.startsWith(p));
}

function getSessionMessages(sessionId) {
    if (!isSessionEligible(sessionId)) return [];
    const id = String(sessionId);
    return sessionHistory.get(id) || [];
}

function appendSessionMessages(sessionId, messages = []) {
    if (!isSessionEligible(sessionId)) return;
    const id = String(sessionId);
    const existing = sessionHistory.get(id) || [];
    const maxMessages = Number(process.env.AI_SESSION_MAX || 12);
    const next = existing.concat(messages);
    if (Number.isFinite(maxMessages) && maxMessages > 0 && next.length > maxMessages) {
        next.splice(0, next.length - maxMessages);
    }
    sessionHistory.set(id, next);
    scheduleSave();
}

function buildPrompt(text, systemPrompt, history = []) {
    const sections = [];
    if (systemPrompt && systemPrompt.trim()) {
        sections.push(`System Instruction:\n${systemPrompt.trim()}`);
    }
    if (history.length) {
        const historyText = history
            .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
            .join("\n");
        sections.push(`Conversation History:\n${historyText}`);
    }
    sections.push(`User Input:\n${text}`);

    if (!systemPrompt && !history.length) {
        return text;
    }
    return sections.join("\n\n");
}

function normalizeMessages(messages = []) {
    if (!Array.isArray(messages)) return [];
    return messages
        .filter((m) => m && typeof m.content === "string")
        .map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
        }));
}

function loadSessionsFromDisk() {
    if (!sessionsEnabled()) return;
    if (!fs.existsSync(SESSION_FILE)) return;
    try {
        const raw = fs.readFileSync(SESSION_FILE, "utf-8");
        if (!raw.trim()) return;
        const parsed = JSON.parse(raw);
        const sessions = parsed?.sessions || parsed;
        if (!sessions || typeof sessions !== "object") return;
        for (const [id, msgs] of Object.entries(sessions)) {
            const normalized = normalizeMessages(msgs);
            if (normalized.length) {
                sessionHistory.set(id, normalized);
            }
        }
    } catch (error) {
        console.error("Failed to load AI sessions:", error?.message || error);
    }
}

function saveSessionsToDisk() {
    if (!sessionsEnabled()) return;
    try {
        const dir = path.dirname(SESSION_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const sessions = {};
        for (const [id, msgs] of sessionHistory.entries()) {
            sessions[id] = normalizeMessages(msgs);
        }
        const payload = {
            version: 1,
            updatedAt: new Date().toISOString(),
            sessions,
        };
        fs.writeFileSync(SESSION_FILE, JSON.stringify(payload, null, 2));
    } catch (error) {
        console.error("Failed to save AI sessions:", error?.message || error);
    }
}

function scheduleSave() {
    if (!sessionsEnabled()) return;
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        saveSessionsToDisk();
    }, SAVE_DEBOUNCE_MS);
}

function resetSession(sessionId) {
    if (!sessionId) return 0;
    const id = String(sessionId);
    const existing = sessionHistory.get(id);
    sessionHistory.delete(id);
    scheduleSave();
    return existing ? existing.length : 0;
}

function getSessionLength(sessionId) {
    if (!sessionId) return 0;
    const id = String(sessionId);
    const existing = sessionHistory.get(id) || [];
    return existing.length;
}

async function callGroq(text, systemPrompt, history = []) {
    const model = process.env.GROQ_MODEL || "groq/compound-mini";
    const groq = new Groq();
    const messages = [];
    if (systemPrompt && systemPrompt.trim()) {
        messages.push({ role: "system", content: systemPrompt.trim() });
    }
    if (history.length) {
        messages.push(...history);
    }
    messages.push({ role: "user", content: text });
    const data = await groq.chat({
        model,
        messages,
    });
    const content =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.delta?.content ||
        "";
    return {
        result: content,
        conversationId: data?.id || null,
        model: data?.model || model,
    };
}

async function generateText(text, systemPrompt, sessionId) {
    try {
        const startedAt = Date.now();
        const history = getSessionMessages(sessionId);
        const prompt = buildPrompt(text, systemPrompt, history);

        const provider = (process.env.AI_PROVIDER || "groq").toLowerCase();
        let response;
        const userMessage = { role: "user", content: text };

        if (provider === "groq") {
            try {
                response = await callGroq(text, systemPrompt, history);
            } catch (primaryError) {
                const fallback = (process.env.AI_FALLBACK || "claude").toLowerCase();
                if (fallback === "none" || fallback === "off") {
                    throw primaryError;
                }
                console.error(
                    "Groq failed, trying fallback:",
                    primaryError?.message || primaryError
                );
                if (fallback === "claude") {
                    response = await claude(prompt);
                } else {
                    throw primaryError;
                }
            }
        } else {
            response = await claude(prompt);
        }
        const responseTime = `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
        const assistantMessage = {
            role: "assistant",
            content: response?.result || "",
        };
        appendSessionMessages(sessionId, [userMessage, assistantMessage]);

        return {
            result: response.result || "",
            responseTime,
            provider: provider === "groq" ? "g4f.space/groq" : "claude.ai",
            sessionId,
            conversationId: response.conversationId || null,
            model: response.model || null,
        };
    } catch (error) {
        console.error("AI API Error:", error?.message || error);
        throw error;
    }
}

async function checkToxic(text) {
    const systemPrompt = "You are a content moderation AI. Your task is to detect if the following message contains toxic, offensive, hate speech, or extremely rude content. Answer ONLY with 'YES' if it is toxic, or 'NO' if it is safe. Do not provide any explanation.";
    try {
        const response = await generateText(text, systemPrompt, "system-moderation");
        const result = response.result.trim().toUpperCase();
        return result.includes("YES");
    } catch (error) {
        console.error("Moderation Check Error:", error);
        return false;
    }
}

async function summarizeChat(chatContent) {
    const systemPrompt = "You are a helpful assistant. Summarize the following chat conversation. Focus on the main topics discussed and key points. Keep it concise and use bullet points if appropriate.";
    try {
        const response = await generateText(chatContent, systemPrompt, "system-summary");
        return response.result;
    } catch (error) {
        console.error("Summarization Error:", error);
        throw error;
    }
}

loadSessionsFromDisk();

module.exports = {
    generateText,
    checkToxic,
    summarizeChat,
    resetSession,
    getSessionLength,
    sessionsEnabled
};
