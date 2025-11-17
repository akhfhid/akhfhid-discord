# Bot Discord by akhfhid

A Discord bot project developed and maintained by **Affan Khulafa Hidayah (akhfhid)**.
Portfolio: [https://akhfhid.my.id](https://akhfhid.my.id)

A Discord bot built with Node.js and Discord.js v14.
<p align="center">
  <img src="https://img.shields.io/badge/Node-%3E%3D18.0.0-339933?logo=node.js" />
  <img src="https://img.shields.io/badge/Discord.js-v14-5865F2?logo=discord" />
  <a href="https://www.gnu.org/licenses/gpl-3.0">
    <img src="https://img.shields.io/badge/License-GPL%20v3-yellow.svg" />
  </a>
</p>


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

This command automatically installs every package listed in `package.json`. You do not need to install each dependency manually.

3. Create a `.env` file:

```
TOKEN=your_discord_bot_token
CLIENT_ID=your_application_client_id
GUILD_ID=your_guild_id
```

4. Start the bot:

```bash
node index.js
```

---

## Features

* Modern Discord.js v14 architecture
* Automatic command loading
* Music playback using DisTube and play-dl
* YouTube search and streaming
* Translation support via Google Translate API
* Environment-based configuration with dotenv
* File watching and auto-reload using chokidar
* Scheduled tasks using node-cron
* Logging and terminal styling using chalk

---

# How to Create a Discord Bot (English Guide)

## 1. Create a Discord Application

1. Open the Discord Developer Portal: [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click "New Application".
3. Enter the application name and confirm.

## 2. Create a Bot User

1. Open your application.
2. Go to the "Bot" tab in the left sidebar.
3. Click "Add Bot".
4. Click "Reset Token" to generate your bot token.
5. Copy the token and place it in your `.env` file as `TOKEN`.

## 3. Enable Privileged Gateway Intents

1. Stay inside the "Bot" tab.
2. Scroll down to the "Privileged Gateway Intents" section.
3. Enable:

   * Presence Intent
   * Server Members Intent
   * Message Content Intent

## 4. Invite the Bot to Your Server

1. Go to the "OAuth2" tab.
2. Select "URL Generator".
3. Under "Scopes", check `bot`.
4. Under "Bot Permissions", select the permissions your bot needs.
5. Copy the generated URL.
6. Open the URL in your browser and invite the bot to your server.

## 5. Run the Bot

Make sure your `.env` file has all required values.

Then run:

```bash
node index.js
```

The bot should now be online.

If you need additional setup guidance or want to add command examples, feel free to ask.
