import { describe, expect, it } from 'vitest';

import playwrightConfig, {
  E2E_PREVIEW_ORIGIN,
  E2E_PREVIEW_PORT,
} from '../playwright.config';

describe('Playwright preview port isolation', () => {
  it('uses one explicit test-only loopback port without reusing a human server', () => {
    const webServers = Array.isArray(playwrightConfig.webServer)
      ? playwrightConfig.webServer
      : [playwrightConfig.webServer];
    expect(webServers).toHaveLength(1);
    const [webServer] = webServers;
    expect(webServer).toBeDefined();
    if (!webServer) throw new Error('Playwright must configure its preview server.');

    const baseUrl = new URL(String(playwrightConfig.use?.baseURL));
    const readinessUrl = new URL(String(webServer.url));
    const commandPorts = [
      ...webServer.command.matchAll(/(?:^|\s)--port\s+([1-9][0-9]*)(?=\s|$)/g),
    ].map((match) => match[1]);
    const commandHosts = [
      ...webServer.command.matchAll(/(?:^|\s)--host\s+(\S+)(?=\s|$)/g),
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
    expect(webServer.reuseExistingServer).toBe(false);
  });
});
