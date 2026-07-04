#!/usr/bin/env node
/**
 * xiaozhi-music-railway — Real music MCP WebSocket server
 *
 * Uses Meting (metowolf/Meting) to search and fetch playable URLs
 * from Netease, Tencent/QQ, Kugou, and Kuwo music platforms.
 *
 * Protocol: MCP JSON-RPC 2.0 over WebSocket
 * Designed for Railway.app deployment (env PORT)
 */
import { WebSocketServer, WebSocket } from 'ws';
import Meting from './lib/meting/meting.js';

// ─── Config ────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8765', 10);
const HOST = process.env.HOST || '0.0.0.0';
// When set, run as a CLIENT that dials OUT to the xiaozhi.me MCP access
// point (Agent → MCP 接入点 → wss://api.xiaozhi.me/mcp/?token=…) instead of
// listening for inbound connections. Required for the official cloud.
const MCP_ENDPOINT = process.env.MCP_ENDPOINT || process.env.XIAOZHI_MCP_ENDPOINT || '';

// ─── Meting client factory ──────────────────────────────────────
function createClient(platform) {
  const meting = new Meting(platform);
  meting.format(true);

  // Optional cookies from env
  const cookieVar = `METING_${platform.toUpperCase()}_COOKIE`;
  const cookie = process.env[cookieVar] || process.env.METING_COOKIE;
  if (cookie) {
    meting.cookie(cookie);
  }

  return meting;
}

// ─── Tool definitions ───────────────────────────────────────────
const PLATFORMS = ['netease', 'tencent', 'kugou', 'kuwo'];

const TOOLS = [
  {
    name: 'platforms',
    description: 'List supported music platforms (netease, tencent, kugou, kuwo).',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      return JSON.stringify({ ok: true, data: PLATFORMS.map(p => ({
        code: p,
        name: { netease: 'NetEase Cloud Music', tencent: 'Tencent QQ Music', kugou: 'KuGou Music', kuwo: 'Kuwo Music' }[p]
      }))}, null, 2);
    }
  },
  {
    name: 'search',
    description: 'Search songs, albums or artists on a specific music platform.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        keyword: { type: 'string', description: 'Search keyword (song/artist name)' },
        page: { type: 'integer', description: 'Page number', default: 1 },
        limit: { type: 'integer', description: 'Results per page', default: 20 }
      },
      required: ['platform', 'keyword']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const options = {};
      if (args.page) options.page = args.page;
      if (args.limit) options.limit = args.limit;
      const raw = await client.search(args.keyword, options);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'song',
    description: 'Get song details by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Song ID' }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.song(args.id);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'url',
    description: 'Get playable audio URL for a song by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Song ID' },
        br: { type: 'integer', description: 'Bitrate (e.g. 128, 320)', default: 320 }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.url(args.id, args.br || 320);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'album',
    description: 'Get album details by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Album ID' }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.album(args.id);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'artist',
    description: 'Get artist songs by artist ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Artist ID' },
        limit: { type: 'integer', description: 'Max results', default: 50 }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.artist(args.id, args.limit || 50);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'playlist',
    description: 'Get playlist details by playlist ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Playlist ID' }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.playlist(args.id);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'lyric',
    description: 'Get song lyrics by song ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Song ID' }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.lyric(args.id);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  },
  {
    name: 'pic',
    description: 'Get cover/picture URL by resource ID.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: PLATFORMS, description: 'Music platform' },
        id: { type: 'string', description: 'Picture/resource ID' },
        size: { type: 'integer', description: 'Image size in pixels', default: 300 }
      },
      required: ['platform', 'id']
    },
    handler: async (args) => {
      const client = createClient(args.platform);
      const raw = await client.pic(args.id, args.size || 300);
      return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    }
  }
];

// ─── MCP JSON-RPC handler ───────────────────────────────────────
async function handleMessage(data) {
  const { id, method, params = {} } = data;

  // JSON-RPC notifications (e.g. "notifications/initialized") carry no id and
  // must NOT receive a response. Returning null tells the transport to stay quiet.
  if (id === undefined || id === null || (typeof method === 'string' && method.startsWith('notifications/'))) {
    return null;
  }

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: true } },
            serverInfo: { name: 'xiaozhi-music-railway', version: '1.0.0' }
          }
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0', id,
          result: {
            tools: TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
          }
        };

      case 'tools/call': {
        const tool = TOOLS.find(t => t.name === params.name);
        if (!tool) {
          return {
            jsonrpc: '2.0', id,
            error: { code: -32601, message: `Unknown tool: ${params.name}` }
          };
        }
        const text = await tool.handler(params.arguments || {});
        return {
          jsonrpc: '2.0', id,
          result: { content: [{ type: 'text', text }] }
        };
      }

      default:
        return {
          jsonrpc: '2.0', id,
          error: { code: -32601, message: `Unknown method: ${method}` }
        };
    }
  } catch (err) {
    console.error(`Error handling ${method}:`, err);
    return {
      jsonrpc: '2.0', id,
      error: { code: -32603, message: err.message || 'Internal error' }
    };
  }
}

// Handle one raw WebSocket frame: parse JSON-RPC, dispatch, reply on the same
// socket. Shared by both the inbound server and the outbound client transports.
async function handleFrame(ws, raw) {
  let data;
  try {
    data = JSON.parse(raw.toString());
  } catch {
    ws.send(JSON.stringify({
      jsonrpc: '2.0', id: null,
      error: { code: -32700, message: 'Parse error' }
    }));
    return;
  }

  const response = await handleMessage(data);
  if (response) {
    ws.send(JSON.stringify(response));
  }
}

// ─── Mode 1: outbound client (official xiaozhi.me MCP access point) ──────────
// Dials OUT to MCP_ENDPOINT and auto-reconnects. This is the model the official
// cloud uses: it hands you a wss://…?token=… URL and your server connects to it.
function startClient(endpoint) {
  let backoff = 1000;
  const MAX_BACKOFF = 30000;

  const connect = () => {
    // Avoid logging the token in the URL.
    const safe = endpoint.replace(/(token=)[^&]+/i, '$1***');
    console.log(`[client] connecting to ${safe}`);
    const ws = new WebSocket(endpoint);

    ws.on('open', () => {
      backoff = 1000;
      console.log('[client] connected to xiaozhi MCP endpoint');
    });

    ws.on('message', (raw) => { handleFrame(ws, raw); });

    ws.on('close', () => {
      console.warn(`[client] disconnected — reconnecting in ${backoff}ms`);
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF);
    });

    ws.on('error', (err) => {
      console.error('[client] error:', err.message);
      // 'close' fires after 'error' and drives the reconnect.
    });
  };

  connect();
  console.log(`[ready] client mode | Music MCP Server (Meting)`);
  console.log(`[ready] Platforms: ${PLATFORMS.join(', ')}`);
}

// ─── Mode 2: inbound server (self-hosted / direct-connect setups) ────────────
function startServer() {
  const wss = new WebSocketServer({ port: PORT, host: HOST });

  wss.on('connection', (ws, req) => {
    const addr = req.socket.remoteAddress;
    console.log(`[connect] ${addr}`);

    ws.on('message', (raw) => { handleFrame(ws, raw); });
    ws.on('close', () => { console.log(`[disconnect] ${addr}`); });
    ws.on('error', (err) => { console.error(`[error] ${addr}:`, err.message); });
  });

  console.log(`[ready] wss://${HOST}:${PORT}  |  Music MCP Server (Meting)`);
  console.log(`[ready] Platforms: ${PLATFORMS.join(', ')}`);
}

// ─── Boot ───────────────────────────────────────────────────────────────────
if (MCP_ENDPOINT) {
  startClient(MCP_ENDPOINT);
} else {
  startServer();
}
