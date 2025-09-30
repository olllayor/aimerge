import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { ModelInfo } from './types.js';

const CONFIG_DIR = getConfigDir();
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const MODEL_CACHE_FILE = join(CONFIG_DIR, 'models-cache.json');

export interface StoredConfig {
	apiKey?: string;
	preferredModel?: string;
}

export interface RuntimeConfig extends StoredConfig {}

interface ModelCacheData {
	timestamp: number;
	models: ModelInfo[];
}

export function loadRuntimeConfig(): RuntimeConfig {
	const stored = loadStoredConfig();
	return {
		apiKey: process.env.OPENROUTER_API_KEY ?? stored.apiKey,
		preferredModel: process.env.AIMERGE_MODEL ?? stored.preferredModel,
	};
}

export function getStoredConfig(): StoredConfig {
	return loadStoredConfig();
}

export function saveApiKey(apiKey: string): void {
	const stored = loadStoredConfig();
	stored.apiKey = apiKey;
	saveStoredConfig(stored);
}

export function savePreferredModel(modelId: string): void {
	const stored = loadStoredConfig();
	stored.preferredModel = modelId;
	saveStoredConfig(stored);
}

export function loadModelCache(maxAgeMs: number): ModelInfo[] | null {
	if (!existsSync(MODEL_CACHE_FILE)) {
		return null;
	}

	try {
		const data = JSON.parse(readFileSync(MODEL_CACHE_FILE, 'utf8')) as ModelCacheData;
		if (Date.now() - data.timestamp > maxAgeMs) {
			return null;
		}
		return data.models;
	} catch {
		return null;
	}
}

export function saveModelCache(models: ModelInfo[]): void {
	ensureDir(CONFIG_DIR);
	const data: ModelCacheData = {
		timestamp: Date.now(),
		models,
	};
	writeFileSync(MODEL_CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function clearModelCache(): void {
	if (existsSync(MODEL_CACHE_FILE)) {
		rmSync(MODEL_CACHE_FILE, { force: true });
	}
}

function loadStoredConfig(): StoredConfig {
	if (!existsSync(CONFIG_FILE)) {
		return {};
	}

	try {
		return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) as StoredConfig;
	} catch {
		return {};
	}
}

function saveStoredConfig(config: StoredConfig): void {
	ensureDir(CONFIG_DIR);
	writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function getConfigDir(): string {
	if (process.env.AIMERGE_CONFIG_DIR) {
		return process.env.AIMERGE_CONFIG_DIR;
	}

	const home = homedir();
	if (platform() === 'win32') {
		const base = process.env.APPDATA ?? join(home, 'AppData', 'Roaming');
		return join(base, 'aimerge');
	}

	const xdg = process.env.XDG_CONFIG_HOME ?? join(home, '.config');
	return join(xdg, 'aimerge');
}

function ensureDir(path: string): void {
	if (!existsSync(path)) {
		mkdirSync(path, { recursive: true });
	}
}
