import { fetchFreeModels, pickModel, requestCompletion } from './openrouter.js';
import { ConflictBlock, ModelInfo } from './types.js';
import { withRetry } from './retry.js';
import chalk from 'chalk';

export interface ResolveRequest {
	conflict: ConflictBlock;
	model: ModelInfo | null;
}

export interface ResolveResponse {
	resolution: string;
}

export type Resolver = (request: ResolveRequest) => Promise<ResolveResponse>;

export const notImplementedResolver: Resolver = async ({ conflict }) => ({
	resolution: conflict.incoming || conflict.current,
});

export interface OpenRouterResolverOptions {
	apiKey: string;
	preferredModelId?: string;
	cachedModels?: ModelInfo[] | null;
	onModelsFetched?: (models: ModelInfo[]) => void;
}

export interface OpenRouterResolverResult {
	model: ModelInfo;
	resolver: Resolver;
	availableModels: ModelInfo[];
	fromCache: boolean;
	preferredModelFallback?: {
		requestedId: string;
	};
}

export async function createOpenRouterResolver(options: OpenRouterResolverOptions): Promise<OpenRouterResolverResult> {
	let models = options.cachedModels ?? [];
	let usedCache = models.length > 0;

	try {
		models = await fetchFreeModels(options.apiKey);
		usedCache = false;
		options.onModelsFetched?.(models);
	} catch (error) {
		if (!models.length) {
			throw error;
		}
	}

	let preferredModelFallback: string | undefined;
	let model: ModelInfo;
	try {
		model = pickModel(models, options.preferredModelId);
	} catch (error) {
		if (options.preferredModelId && models.length) {
			preferredModelFallback = options.preferredModelId;
			model = pickModel(models);
		} else {
			throw error;
		}
	}

	const resolver: Resolver = async ({ conflict }) => {
		const raw = await withRetry(() => requestCompletion(options.apiKey, model.id, conflict), {
			maxAttempts: 3,
			delayMs: 1000,
			onRetry: (error, attempt) => {
				console.log(chalk.yellow(`⚠️ API request failed (attempt ${attempt}), retrying... ${error.message}`));
			},
		});
		return {
			resolution: sanitizeCompletion(raw),
		};
	};

	return {
		model,
		resolver,
		availableModels: models,
		fromCache: usedCache,
		preferredModelFallback: preferredModelFallback ? { requestedId: preferredModelFallback } : undefined,
	};
}

function sanitizeCompletion(completion: string): string {
	let trimmed = completion.trim();

	// Remove markdown code blocks
	if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
		const lines = trimmed.split(/\r?\n/);
		if (lines.length >= 3) {
			trimmed = lines.slice(1, -1).join('\n').trim();
		}
	}

	// Remove any remaining conflict markers the AI might have included
	trimmed = trimmed.replace(/^<{7}.*$/gm, '');
	trimmed = trimmed.replace(/^={7}.*$/gm, '');
	trimmed = trimmed.replace(/^>{7}.*$/gm, '');

	return trimmed.trim();
}
