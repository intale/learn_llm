import { describe, expect, it } from 'vitest';

import playwrightConfig, {
  E2E_PREVIEW_ORIGIN,
  E2E_PREVIEW_PORT,
  E2E_PROXY_ORIGIN,
  E2E_PROXY_PORT,
} from '../playwright.config';

describe('Playwright preview and network isolation', () => {
  it('uses one owned loopback preview and a closed proxy for external requests', () => {
    const webServers = Array.isArray(playwrightConfig.webServer)
      ? playwrightConfig.webServer
      : [playwrightConfig.webServer];
    expect(webServers).toHaveLength(2);
    const previewServer = webServers.find((server) =>
      server?.command.includes('npm run preview'),
    );
    const proxyServer = webServers.find((server) =>
      server?.command.includes('block-external-proxy.mjs'),
    );
    expect(previewServer).toBeDefined();
    expect(proxyServer).toBeDefined();
    if (!previewServer || !proxyServer) {
      throw new Error('Playwright must configure its preview and rejecting proxy.');
    }

    const baseUrl = new URL(String(playwrightConfig.use?.baseURL));
    const readinessUrl = new URL(String(previewServer.url));
    const commandPorts = [
      ...previewServer.command.matchAll(
        /(?:^|\s)--port\s+([1-9][0-9]*)(?=\s|$)/g,
      ),
    ].map((match) => match[1]);
    const commandHosts = [
      ...previewServer.command.matchAll(/(?:^|\s)--host\s+(\S+)(?=\s|$)/g),
    ].map((match) => match[1]);

    expect(E2E_PREVIEW_PORT).toBe(64_173);
    expect(E2E_PREVIEW_PORT).not.toBe(4_321);
    expect(E2E_PREVIEW_PORT).toBeGreaterThanOrEqual(1_024);
    expect(E2E_PREVIEW_PORT).toBeLessThanOrEqual(65_535);
    expect(E2E_PREVIEW_ORIGIN).toBe(`http://127.0.0.1:${E2E_PREVIEW_PORT}`);
    expect(baseUrl.origin).toBe(E2E_PREVIEW_ORIGIN);
    expect(readinessUrl.origin).toBe(E2E_PREVIEW_ORIGIN);
    expect(readinessUrl.pathname).toBe('/');
    expect(commandPorts).toEqual([String(E2E_PREVIEW_PORT)]);
    expect(commandHosts).toEqual(['127.0.0.1']);
    expect(previewServer.reuseExistingServer).toBe(false);

    const proxyReadinessUrl = new URL(String(proxyServer.url));
    expect(E2E_PROXY_PORT).toBe(64_174);
    expect(E2E_PROXY_PORT).not.toBe(E2E_PREVIEW_PORT);
    expect(E2E_PROXY_PORT).not.toBe(4_321);
    expect(E2E_PROXY_ORIGIN).toBe(`http://127.0.0.1:${E2E_PROXY_PORT}`);
    expect(proxyReadinessUrl.origin).toBe(E2E_PROXY_ORIGIN);
    expect(proxyReadinessUrl.pathname).toBe('/ready');
    expect(proxyServer.command).toBe(
      `node tests/e2e/block-external-proxy.mjs --host 127.0.0.1 --port ${E2E_PROXY_PORT}`,
    );
    expect(proxyServer.reuseExistingServer).toBe(false);

    const proxy = playwrightConfig.use?.proxy;
    expect(proxy).toEqual({
      server: E2E_PROXY_ORIGIN,
      bypass: '127.0.0.1',
    });
    const proxyUrl = new URL(String(proxy?.server));
    expect(proxyUrl.protocol).toBe('http:');
    expect(proxyUrl.hostname).toBe('127.0.0.1');
    expect(proxyUrl.port).toBe(String(E2E_PROXY_PORT));
    expect(proxyUrl.origin).not.toBe(E2E_PREVIEW_ORIGIN);
  });
});
