const axios = require("axios");
const crypto = require("crypto");

async function deepimg(prompt) {
  const cleanPrompt = String(prompt || "").trim();
  if (!cleanPrompt) {
    return { status: false, msg: "Prompt kosong. Isi prompt dulu ya." };
  }

  const deviceId = crypto.randomBytes(16).toString("hex");
  const payload = {
    device_id: deviceId,
    prompt: cleanPrompt,
    size: "1024x1024",
  };

  try {
    const response = await axios.request({
      method: "POST",
      url: "https://api-preview.chatgot.io/api/v1/deepimg/flux-1-dev",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        "Content-Type": "application/json",
        referer: "https://deepimg.ai/",
        origin: "https://deepimg.ai",
      },
      data: payload,
      timeout: 90000,
    });

    const image = response?.data?.data?.images?.[0]?.url || null;
    if (!image) {
      return {
        status: false,
        msg: "Gagal dapet URL gambar dari API DeepImg.",
      };
    }

    return { status: true, image };
  } catch (error) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Unknown error";
    return { status: false, msg: `DeepImg error: ${msg}` };
  }
}

module.exports = deepimg;
