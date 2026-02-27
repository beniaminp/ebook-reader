/// <reference types="vitest" />

import path from 'path'
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

/**
 * Vite plugin that proxies requests to /api/cors-proxy?url=<encoded-url>
 * to bypass CORS restrictions when fetching external OPDS feeds in the browser.
 */
function corsProxyPlugin(): Plugin {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use('/api/cors-proxy', async (req, res) => {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          });
          res.end();
          return;
        }

        const url = new URL(req.url || '', 'http://localhost');
        const targetUrl = url.searchParams.get('url');

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing "url" query parameter');
          return;
        }

        try {
          // Forward all headers except host/origin/referer
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(req.headers)) {
            const lower = key.toLowerCase();
            if (['host', 'origin', 'referer', 'connection'].includes(lower)) continue;
            if (typeof value === 'string') headers[key] = value;
          }

          const response = await fetch(targetUrl, {
            method: req.method || 'GET',
            headers,
          });

          // Forward response headers, adding CORS
          res.writeHead(response.status, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
          });

          const buffer = Buffer.from(await response.arrayBuffer());
          res.end(buffer);
        } catch (err: any) {
          res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
          res.end(`Proxy error: ${err.message}`);
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/ebook-reader/' : '/',
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11'],
      modernTargets: ['chrome>=87', 'firefox>=78', 'safari>=14', 'edge>=88'],
    }),
    nodePolyfills({
      include: ['events', 'buffer', 'process', 'util', 'stream', 'path', 'crypto'],
      globals: { Buffer: true, global: true, process: true },
    }),
    corsProxyPlugin(),
  ],
  resolve: {
    alias: {
      'bittorrent-dht': path.resolve(__dirname, 'src/stubs/empty-module.js'),
    },
  },
  optimizeDeps: {
    include: ['webtorrent'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
