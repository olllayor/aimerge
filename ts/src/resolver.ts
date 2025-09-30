import { fetchFreeModels, pickModel, requestCompletion } from './openrouter.js';
import { ConflictBlock, ModelInfo } from './types.js';

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

	const model = pickModel(models, options.preferredModelId);

	const resolver: Resolver = async ({ conflict }) => {
		const raw = await requestCompletion(options.apiKey, model.id, conflict);
		return {
			resolution: sanitizeCompletion(raw),
		};
	};

	return { model, resolver, availableModels: models, fromCache: usedCache };
}

function sanitizeCompletion(completion: string): string {
	const trimmed = completion.trim();
	if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
		const lines = trimmed.split(/\r?\n/);
		if (lines.length >= 3) {
			return lines.slice(1, -1).join('\n').trim();
		}
	}
	return trimmed;
}
