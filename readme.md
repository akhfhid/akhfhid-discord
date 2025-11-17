# Bot Discord by akhfhid

A powerful and modular Discord bot built and maintained by **Affan Khulafa Hidayah (akhfhid)**.
Portfolio: <a href="https://akhfhid.my.id" target="_blank"><strong>akhfhid.my.id</strong></a>

<p align="center">
  <img src="https://img.shields.io/badge/Node-%3E%3D18.0.0-339933?logo=node.js" />
  <img src="https://img.shields.io/badge/Discord.js-v14-5865F2?logo=discord" />
  <a href="https://www.gnu.org/licenses/gpl-3.0">
    <img src="https://img.shields.io/badge/License-GPL%20v3-yellow.svg" />
  </a>
</p>

A full-featured Discord bot built using **Node.js** and **Discord.js v14**, designed with a clean architecture and scalability in mind.

> **Note:**
> This project currently **does not support Linux environments** due to OS-specific modules used during development.
> Supported platform: **Windows only**.

---

## Installation

1. Clone this repository:

```bash
git clone https://github.com/akhfhid/akhfhid-discord.git
cd akhfhid-bot-dc
```

2. Install all dependencies:

```bash
npm install
```

3. Create a `.env` file:

```
TOKEN=your_discord_bot_token
CLIENT_ID=your_application_client_id
GUILD_ID=your_guild_id
PREFIX=!
```

---

## Features

* Modern **Discord.js v14** architecture
* Automatic command loader
* **AI Features** (ChatGPT + Perplexity API integration)
* Music playback using DisTube + play-dl
* YouTube search and streaming
* Google Translate support
* Environment-based configuration with dotenv
* Auto-reload using chokidar
* Scheduled jobs with node-cron
* Clean logging using chalk

---

# How to Create a Discord Bot

## 1. Create a Discord Application

1. Go to: [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application**
3. Enter any application name

## 2. Create a Bot User

1. Open the **Bot** tab
2. Click **Add Bot**
3. Click **Reset Token** to generate your bot token
4. Insert the token into your `.env` file as `TOKEN`

## 3. Enable Privileged Gateway Intents

Inside the **Bot** settings, enable:

* Presence Intent
* Server Members Intent
* Message Content Intent

## 4. Invite the Bot to Your Server

1. Open **OAuth2 → URL Generator**
2. Under *Scopes*, select `bot`
3. Choose the permissions your bot needs
4. Copy and open the generated URL to invite the bot

## 5. Run the Bot

1. Make sure dependencies are installed and `.env` is configured.
2. Start the bot:

```bash
node index.js
```

3. Test if the bot is working using the built-in ping command:

```bash
!ping
```

If the bot responds with `Pong!`, everything is working correctly.

---

If you need additional setup guidance or want to add command examples, feel free to ask.
