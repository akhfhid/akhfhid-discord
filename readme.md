# akhfhid-bot-dc

A powerful, modular, and feature-rich Discord bot built with **Node.js** and **Discord.js v14**. This bot is designed to be easily extensible and comes packed with essential features for modern Discord servers.

## Features

### 🤖 AI Capabilities
- **AI Chat**: Chat with an intelligent AI assistant using `!ai` or `!chat`.
- **AI Research**: Perform deep research on any topic using Perplexity AI integration with `!airesearch` or `!perplexity`.
- **Source Citations**: AI responses include citations and sources for verification.

### 🎵 Music System
- **High Quality Playback**: Powered by **DisTube** and **ffmpeg**.
- **Commands**:
  - `!play <song/url>`: Play a song or add to queue.
  - `!queue`: View the current song queue.
  - `!skip`: Skip the current song.
  - `!stop`: Stop playback and leave the channel.
- **Supported Sources**: YouTube, SoundCloud, Spotify, and more.

### 📈 Leveling System
- **XP Tracking**: Users gain XP by chatting.
- **Level Up**: Automatic level-up notifications with custom embeds.
- **Leaderboard**: View the top 10 most active users with `!leaderboard`.
- **Rank Card**: Check your current level and progress with `!level`.

### 🛠️ Utilities & Moderation
- **User Info**: Get detailed information about a user with `!userinfo`.
- **Server Info**: View comprehensive server statistics with `!serverinfo`.
- **Roblox Stalker**: Look up Roblox user profiles and stats with `!roblox`.
- **Maintenance Mode**: Announce server maintenance with `!maintenance` and `!maintdone`.
- **Feature Requests**: Users can request features via `!reqfitur`.

### 📅 Automation
- **Scheduled Messages**: Set up daily automated messages (e.g., morning greetings) with `!setschedule`.
- **Welcome System**: Customizable welcome messages for new members.

## Installation

### Prerequisites
- **Node.js** v16.9.0 or higher
- **FFmpeg** (for music features)

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
   Create a `.env` file in the root directory and add the following:
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

## Project Structure

- `index.js`: Main entry point. Handles bot startup, events, and command loading.
- `handler.js`: Dynamic command and plugin handler.
- `slashHandler.js`: Handles registration and execution of Slash Commands.
- `plugins/`: Contains all text-based commands (prefix commands).
- `slash/`: Contains Slash Command definitions.
- `data/`: Stores JSON data for levels, schedules, etc.

## Contributing

Feel free to fork this repository and submit pull requests. Contributions are welcome!

## License

This project is licensed under the ISC License.
