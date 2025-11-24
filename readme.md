# akhfhid-bot-dc

![Node.js](https://img.shields.io/badge/node.js-16.9.0+-brightgreen.svg)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)
![License](https://img.shields.io/badge/license-ISC-orange.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

A robust, modular, and feature-rich Discord bot built with **Node.js** and **Discord.js v14**. This bot is designed for easy extensibility and comes equipped with essential features for modern Discord servers.

## Features

| Category                   | Feature               | Description                                                                                             |
| :------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------ |
| **AI Capabilities**        | AI Chat               | Interact with an intelligent AI assistant using `!ai` or `!chat`.                                       |
|                            | AI Research           | Conduct deep research on any topic using Perplexity AI integration with `!airesearch` or `!perplexity`. |
|                            | Source Citations      | AI responses include citations and sources for verification purposes.                                   |
| **Music System**           | High Quality Playback | Powered by **DisTube** and **ffmpeg** for superior audio quality.                                       |
|                            | Commands              | `!play`, `!queue`, `!skip`, `!stop` to manage music playback.                                           |
|                            | Supported Sources     | Supports YouTube, SoundCloud, Spotify, and more.                                                        |
| **Leveling System**        | XP Tracking           | Users gain XP through chat activity.                                                                    |
|                            | Level Up              | Automatic notifications upon leveling up with custom embeds.                                            |
|                            | Leaderboard           | View the top 10 most active users with `!leaderboard`.                                                  |
|                            | Rank Card             | Check current level and progress with `!level`.                                                         |
| **Utilities & Moderation** | Web Dashboard         | Monitor bot and server statistics via an intuitive web dashboard.                                       |
|                            | User Info             | Retrieve detailed user information with `!userinfo`.                                                    |
|                            | Server Info           | View comprehensive server statistics with `!serverinfo`.                                                |
|                            | Roblox Stalker        | Lookup Roblox user profiles and statistics with `!roblox`.                                              |
|                            | Maintenance Mode      | Announce server maintenance with `!maintenance` and `!maintdone`.                                       |
|                            | Feature Requests      | Users can submit feature requests via `!reqfitur`.                                                      |
| **Automation**             | Scheduled Messages    | Configure daily automated messages (e.g., morning greetings) with `!setschedule`.                       |
|                            | Welcome System        | Customizable welcome messages for new members.                                                          |

## Installation

### Prerequisites

- **Node.js** v16.9.0 or higher
- **FFmpeg** (required for music features)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/akhfhid/akhfhid-bot-dc.git
   cd akhfhid-bot-dc
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add the following configuration:

   ```env
   TOKEN=your_discord_bot_token
   PREFIX=!
   BASE_API=your_api_endpoint
   BASE_URL=your_base_url
   ```

4. **Start the Bot**
   ```bash
   node index.js
   ```

## Discord Bot Creation Guide

If you do not have a Discord bot yet, follow these steps to create one:

1. **Access the Discord Developer Portal**
   Navigate to the [Discord Developer Portal](https://discord.com/developers/applications) and log in with your Discord account.

2. **Create a New Application**

   - Click the **New Application** button in the top right corner.
   - Enter a name for your application (e.g., "MusicBot") and click **Create**.

3. **Configure the Bot**

   - In the left sidebar, click **Bot**.
   - Click **Add Bot** and confirm by selecting **Yes, do it!**.
   - You may customize your bot's icon and username here.

4. **Retrieve the Token**

   - On the Bot page, click the **Reset Token** button to generate your bot token.
   - **IMPORTANT**: Do not share this token. Copy it and paste it into your `.env` file under the `TOKEN` variable.

5. **Enable Privileged Intents**

   - Scroll down to the **Privileged Gateway Intents** section.
   - Enable **Presence Intent**, **Server Members Intent**, and **Message Content Intent**.
   - Click **Save Changes**.

6. **Invite the Bot to Your Server**
   - In the left sidebar, click **OAuth2** then **URL Generator**.
   - Under **Scopes**, check `bot` and `applications.commands`.
   - Under **Bot Permissions**, check `Administrator` (or select specific permissions as needed).
   - Copy the generated URL at the bottom and open it in your browser to invite the bot to your server.

## Project Structure

- `index.js`: Main entry point. Handles bot startup, events, and command loading.
- `handler.js`: Dynamic command and plugin handler.
- `slashHandler.js`: Handles registration and execution of Slash Commands.
- `plugins/`: Contains all text-based commands (prefix commands).
- `slash/`: Contains Slash Command definitions.
- `data/`: Stores JSON data for levels, schedules, etc.

## Author

**Affan Khulafa Hidayah**

Portfolio: [akhfhid.my.id](https://akhfhid.my.id)

## Contributing

Feel free to fork this repository and submit pull requests. Contributions are welcome.

## License

This project is licensed under the ISC License.
