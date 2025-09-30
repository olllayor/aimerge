import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	saveApiKey,
	loadRuntimeConfig,
	savePreferredModel,
	saveModelCache,
	loadModelCache,
	clearModelCache,
	getStoredConfig,
} from '../src/config.js';

let configDir: string;

beforeEach(() => {
	configDir = mkdtempSync(join(tmpdir(), 'aimerge-test-'));
	process.env.AIMERGE_CONFIG_DIR = configDir;
	delete process.env.OPENROUTER_API_KEY;
	delete process.env.AIMERGE_MODEL;
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

	it('caches and clears model metadata', () => {
		saveModelCache([{ id: 'model', name: 'Model', contextLength: 42 }]);

		const cached = loadModelCache(60_000);
		expect(cached).toHaveLength(1);
		expect(cached?.[0].id).toBe('model');

		clearModelCache();
		expect(loadModelCache(60_000)).toBeNull();
	});
});
