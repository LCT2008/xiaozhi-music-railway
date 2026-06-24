# xiaozhi-music-railway

Real music MCP WebSocket server for XiaoZhi AI — multi-platform music search & playable URLs via Meting.

## Supported Platforms
- **Netease** — 网易云音乐 (music.163.com)
- **Tencent** — QQ音乐 (y.qq.com)
- **Kugou** — 酷狗音乐 (kugou.com)
- **Kuwo** — 酷我音乐 (kuwo.cn)

## MCP Tools (JSON-RPC over WebSocket)

| Tool | Description |
|------|-------------|
| `platforms` | List supported music platforms |
| `search` | Search songs/albums/artists by keyword |
| `song` | Get song details by ID |
| `url` | Get **playable audio URL** by song ID |
| `album` | Get album details by ID |
| `artist` | Get artist works by ID |
| `playlist` | Get playlist by ID |
| `lyric` | Get lyrics by song ID |
| `pic` | Get cover image URL |

## Deploy on Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Fork/push this repo to GitHub
2. Railway → New Project → Deploy from GitHub repo
3. Auto-detects Node.js, auto-deploys
4. Copy the domain → `wss://your-app.up.railway.app`

## Environment Variables (optional)

For higher quality audio, set platform cookies:

- `METING_NETEASE_COOKIE` — Netease Cloud Music cookies
- `METING_TENCENT_COOKIE` — Tencent QQ Music cookies
- `METING_KUGOU_COOKIE` — KuGou Music cookies
- `METING_KUWO_COOKIE` — Kuwo Music cookies
- `METING_COOKIE` — fallback cookie for all platforms

## XiaoZhi MCP Configuration

Add to your XiaoZhi MCP config:
```json
{
  "endpoint": "wss://your-app.up.railway.app"
}
```
