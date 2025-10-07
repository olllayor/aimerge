import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ConfigModule = typeof import('../src/config.js');

let saveApiKey: ConfigModule['saveApiKey'];
let loadRuntimeConfig: ConfigModule['loadRuntimeConfig'];
let savePreferredModel: ConfigModule['savePreferredModel'];
let saveModelCache: ConfigModule['saveModelCache'];
let loadModelCache: ConfigModule['loadModelCache'];
let clearModelCache: ConfigModule['clearModelCache'];
let getStoredConfig: ConfigModule['getStoredConfig'];

let configDir: string;

beforeEach(async () => {
	configDir = mkdtempSync(join(tmpdir(), 'aimerge-test-'));
	process.env.AIMERGE_CONFIG_DIR = configDir;
	delete process.env.OPENROUTER_API_KEY;
	delete process.env.AIMERGE_MODEL;

	vi.resetModules();
	const configModule = await import('../src/config.js');
	({
		saveApiKey,
		loadRuntimeConfig,
		savePreferredModel,
		saveModelCache,
		loadModelCache,
		clearModelCache,
		getStoredConfig,
	} = configModule);
	clearModelCache();
	const configFile = join(configDir, 'config.json');
	if (existsSync(configFile)) {
		rmSync(configFile, { force: true });
	}
});

afterEach(() => {
	delete process.env.AIMERGE_CONFIG_DIR;
	rmSync(configDir, { force: true, recursive: true });
});

describe('configuration management', () => {
	it('persists api key and preferred model', () => {
		saveApiKey('test-key');
		savePreferredModel('model-123');

		const runtime = loadRuntimeConfig();
		expect(runtime.apiKey).toBe('test-key');
		expect(runtime.preferredModel).toBe('model-123');

		const stored = getStoredConfig();
		expect(stored.apiKey).toBe('test-key');
		expect(stored.preferredModel).toBe('model-123');
	});

	it('saves api key from environment into config file when missing', () => {
		process.env.OPENROUTER_API_KEY = 'env-key';

		const runtime = loadRuntimeConfig();
		expect(runtime.apiKey).toBe('env-key');

		const stored = getStoredConfig();
		expect(stored.apiKey).toBe('env-key');
	});

	it("keeps stored api key when it's already set", () => {
		saveApiKey('stored-key');
		process.env.OPENROUTER_API_KEY = 'env-key';

		const runtime = loadRuntimeConfig();
		expect(runtime.apiKey).toBe('env-key');

		const stored = getStoredConfig();
		expect(stored.apiKey).toBe('stored-key');
	});

	it('caches and clears model metadata', () => {
		saveModelCache([{ id: 'model', name: 'Model', contextLength: 42 }]);

		const cached = loadModelCache(60_000);
		expect(cached).toHaveLength(1);
		expect(cached?.[0].id).toBe('model');

		clearModelCache();
		expect(loadModelCache(60_000)).toBeNull();
	});
});
