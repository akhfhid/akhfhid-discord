const claude = require("./claude");
require("dotenv").config();

async function generateText(text, systemPrompt, sessionId) {
    try {
        const startedAt = Date.now();
        const prompt = systemPrompt && systemPrompt.trim()
            ? `System Instruction:\n${systemPrompt.trim()}\n\nUser Input:\n${text}`
            : text;

        const response = await claude(prompt);
        const responseTime = `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;

        return {
            result: response.result || "",
            responseTime,
            provider: "claude.ai",
            sessionId,
            conversationId: response.conversationId || null,
            model: response.model || null,
        };
    } catch (error) {
        console.error("AI API Error (Claude):", error?.message || error);
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

module.exports = {
    generateText,
    checkToxic,
    summarizeChat
};
