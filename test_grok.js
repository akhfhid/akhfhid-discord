const { generateText } = require("./utils/aiHelper");

async function test() {
    try {
        console.log("Testing Grok 4 Fast API...");
        const response = await generateText("Hello, who are you?", "You are a helpful assistant.", "test-session");
        console.log("Response:", JSON.stringify(response, null, 2));
    } catch (error) {
        console.error("Test Failed:", error);
    }
}

test();
