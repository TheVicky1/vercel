import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { client } from '../../../mocks/client';

const execSyncMock = vi.fn();
vi.mock('child_process', () => ({
  execSync: (...args: any[]) => execSyncMock(...args),
}));

const existsSyncMock = vi.fn();
const readFileSyncMock = vi.fn();
vi.mock('fs', async importOriginal => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: (...args: any[]) => existsSyncMock(...args),
      readFileSync: (...args: any[]) => readFileSyncMock(...args),
    },
    existsSync: (...args: any[]) => existsSyncMock(...args),
    readFileSync: (...args: any[]) => readFileSyncMock(...args),
  };
});

describe('mcp (windows)', () => {
  let originalPlatform: string;

  beforeEach(() => {
    client.reset();
    execSyncMock.mockReset();
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32' });
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('quotes Cursor deep link with an empty title when opening on Windows', async () => {
    client.nonInteractive = true;
    existsSyncMock.mockReturnValue(false);

    const { default: setupMcp } = await import(
      '../../../../src/commands/mcp/mcp'
    );
    const code = await setupMcp(client, { clients: ['Cursor'] });
    expect(code).toBe(0);
    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /^start "" "cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=vercel&config=[^"]+"$/
      )
    );
  });

  it('quotes VS Code deep link with an empty title when opening on Windows', async () => {
    client.nonInteractive = true;
    existsSyncMock.mockReturnValue(false);

    const { default: setupMcp } = await import(
      '../../../../src/commands/mcp/mcp'
    );
    const code = await setupMcp(client, { clients: ['VS Code with Copilot'] });
    expect(code).toBe(0);
    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringMatching(/^start "" "vscode:mcp\/install\?[^"]+"$/)
    );
  });

  it('detects existing Cursor configuration in ~/.cursor/mcp.json on Windows', async () => {
    client.nonInteractive = true;
    existsSyncMock.mockImplementation((path: any) => {
      return typeof path === 'string' && path.includes('.cursor');
    });
    readFileSyncMock.mockImplementation((path: any) => {
      if (typeof path === 'string' && path.includes('.cursor')) {
        return JSON.stringify({
          mcpServers: {
            vercel: { url: 'https://mcp.vercel.com' },
          },
        });
      }
      return '{}';
    });

    const { default: setupMcp } = await import(
      '../../../../src/commands/mcp/mcp'
    );
    const code = await setupMcp(client, { clients: ['Cursor'] });
    expect(code).toBe(0);
    const payload = JSON.parse(client.stdout.getFullOutput());
    expect(payload.summary).toContain(
      '✅ Cursor: Vercel MCP already configured'
    );
    expect(execSyncMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^start/)
    );
  });
});
