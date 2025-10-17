# Discord Music Bot

a clean, no-cost discord music bot using yt-dlp + ffmpeg

## features
- plays audio from youtube, soundcloud, bandcamp, twitch (no api costs!)
- queue system with skip/pause/resume
- search by name or paste url
- works with @discordjs/voice directly (no framework bloat)

## setup

### 1. install deps
```bash
npm install
```

### 2. install yt-dlp
```bash
# linux
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp
chmod a+rx ~/.local/bin/yt-dlp

# or use your package manager
# apt, brew, pacman, etc
```

### 3. install ffmpeg
needs libopus support - most distros have this by default
```bash
# debian/ubuntu
sudo apt install ffmpeg

# arch
sudo pacman -S ffmpeg

# mac
brew install ffmpeg
```

### 4. configure bot
copy `.env.example` to `.env` and add your discord bot token

### 5. register commands
```bash
npm run register
```

### 6. run
```bash
npm run dev  # development with auto-reload
npm start    # production
```

## commands
- `/play <query>` - play a song (search or url)
- `/skip` - skip current track
- `/pause` - pause playback
- `/resume` - resume playback
- `/queue` - show current queue
- `/ping` - check bot latency

## tech stack

### core
- **discord.js v14.14.1** - discord api wrapper with es modules
- **@discordjs/voice v0.19.0** - direct voice connection handling (no discord-player framework)
- **@discordjs/opus v0.10.0** - native opus codec bindings (required for voice)
- **sodium-native v5.0.9** - voice encryption (libsodium wrapper)
- **typescript v5.2+** - type-safe development
- **tsx** - fast typescript execution with watch mode

### audio pipeline
- **yt-dlp v2025.10.14+** - extracts audio from youtube/soundcloud/bandcamp/twitch
  - uses `bestaudio/best` format selection
  - supports search with `ytsearch1:` prefix
  - outputs to stdout (`-o -`) for piping
- **ffmpeg v6.1+** - audio processing and opus encoding
  - reads from stdin (`-i pipe:0`)
  - encodes to opus (`-f opus -ar 48000 -ac 2 -b:a 128k`)
  - strict level -2 flag for opus compatibility
  - outputs to stdout for streaming

### architecture
- **es modules** - native esm with `.js` imports
- **slash commands** - discord interaction api (no prefix commands)
- **queue system** - in-memory guild-based queues with Map storage
- **event-driven** - audio player events (idle, error) trigger next track

## how it works
1. **metadata fetch**: yt-dlp runs with `--dump-json --skip-download` to get video info (fast)
2. **audio extraction**: yt-dlp downloads best audio and pipes to stdout
3. **opus encoding**: ffmpeg reads from stdin, converts to 48khz stereo opus, pipes to stdout
4. **discord streaming**: @discordjs/voice wraps opus stream in audio resource, sends to discord voice gateway
5. **no temp files**: entire pipeline uses stdin/stdout piping (memory efficient)

## why these choices?

**yt-dlp over youtube-dl**: 
- actively maintained, faster updates
- better platform support (soundcloud, bandcamp, twitch)
- direct url extraction for fast streaming

**@discordjs/voice over discord-player**:
- direct control over audio pipeline
- no framework overhead or hidden bugs
- better error handling and stream management

**direct url streaming (optimized)**:
- custom ffmpeg with https support
- 2-10x faster than pipe approach (7s vs 15s first play)
- url caching makes replays instant (~1s)
- pre-fetching makes queue tracks start instantly
- automatic fallback to pipe if direct url fails

## supported platforms
- ✅ **youtube** - search or paste urls
- ✅ **soundcloud** - tracks, playlists, sets
- ✅ **bandcamp** - tracks, albums, artist pages
- ✅ **twitch** - vods, clips, live streams
- ❌ **spotify** - not supported (api locked down, requires premium)

## troubleshooting

**no audio?**
- make sure ffmpeg has libopus: `ffmpeg -codecs | grep opus`
- check bot has voice permissions in channel
- verify yt-dlp is installed: `yt-dlp --version`

**bot crashes?**
- check logs in console
- make sure node version is 18+
- verify all deps installed: `npm install`

**yt-dlp fails?**
- update it: `yt-dlp -U`
- some videos are region-locked or age-restricted

## performance

**playback speed:**
- first play: ~7 seconds (direct url extraction + streaming)
- cached/replays: ~1 second (url cached for 5 hours)
- queue tracks: ~1 second (pre-fetched while previous plays)

**optimizations:**
- direct url streaming with custom https-enabled ffmpeg
- url caching (5 hour ttl, youtube urls expire ~6 hours)
- pre-fetching next track while current plays
- graceful fallback to pipe if url extraction fails

## notes
- volume set to 50% by default (adjust in player.ts)
- max queue size: 100 tracks
- no external apis = zero cost = happy wallet
- custom ffmpeg required: `~/ffmpeg_https/ffmpeg_https.sh`
