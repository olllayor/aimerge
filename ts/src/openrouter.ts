import { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';
import { ConflictBlock, ModelInfo } from './types.js';

const API_BASE = 'https://openrouter.ai/api/v1';

interface ApiModel {
	id: string;
	name: string;
	pricing?: { prompt?: string | number; completion?: string | number };
	top_provider?: {
		context_length: number;
		max_completion_tokens: number | null;
		is_moderated: boolean;
	};
}

interface ModelsResponse {
	data: ApiModel[];
}

interface ChatCompletionResponse {
	choices: Array<{
		message: {
			role: string;
			content: string | Array<{ type: string; text: string }>;
		};
	}>;
}

export async function fetchFreeModels(apiKey?: string): Promise<ModelInfo[]> {
	const headers: Record<string, string> = {};
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	const response = await fetch(`${API_BASE}/models`, {
		headers,
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch models (status ${response.status})`);
	}

	const payload = (await response.json()) as ModelsResponse;
	const freeModels = payload.data.filter((model) => isFree(model));

	return freeModels
		.map((model) => ({
			id: model.id,
			name: model.name,
			contextLength: model.top_provider?.context_length ?? 0,
		}))
		.sort((a, b) => b.contextLength - a.contextLength);
}

export function pickModel(models: ModelInfo[], preferred?: string): ModelInfo {
	if (preferred) {
		const match = models.find((model) => model.id === preferred || model.name === preferred);
		if (match) {
			return match;
		}
		throw new Error(`Preferred model ${preferred} not available among free models.`);
	}

	if (!models.length) {
		throw new Error('No free models available on OpenRouter.');
	}

	return models[0];
}

export async function requestCompletion(apiKey: string, modelId: string, conflict: ConflictBlock): Promise<string> {
	const response = await fetch(`${API_BASE}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
			'HTTP-Referer': 'https://github.com/olllayor/aimerge',
			'X-Title': 'AIMerge',
		},
		body: JSON.stringify({
			model: modelId,
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: buildUserPrompt(conflict, conflict.filePath) },
			],
			max_tokens: 2000,
			temperature: 0.2,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		let errorMessage = `OpenRouter request failed (${response.status})`;

		// Check for rate limiting
		if (response.status === 429) {
			const retryAfter = response.headers.get('retry-after');
			if (retryAfter) {
				errorMessage += `. Rate limited. Retry after ${retryAfter} seconds`;
			} else {
				errorMessage += `. Rate limited. Please try again later`;
			}
		}

		try {
			const errorJson = JSON.parse(errorText);
			if (errorJson.error?.message) {
				errorMessage += `: ${errorJson.error.message}`;
			} else {
				errorMessage += `: ${errorText}`;
			}
		} catch {
			errorMessage += `: ${errorText}`;
		}
		throw new Error(errorMessage);
	}

	const payload = (await response.json()) as ChatCompletionResponse;
	const choice = payload.choices[0];
	if (!choice) {
		throw new Error('OpenRouter returned no choices');
	}

	const { content } = choice.message;
	if (typeof content === 'string') {
		return content.trim();
	}

	if (Array.isArray(content)) {
		const textPart = content.find((part) => part.type === 'text');
		if (!textPart) {
			throw new Error('OpenRouter response did not contain text content');
		}
		return textPart.text.trim();
	}

	throw new Error('OpenRouter returned unexpected content format');
}

function isFree(model: ApiModel): boolean {
	const pricing = model.pricing;
	if (!pricing) return false;
	const promptFree = pricing.prompt === 0 || pricing.prompt === '0' || pricing.prompt === null;
	const completionFree = pricing.completion === 0 || pricing.completion === '0' || pricing.completion === null;
	return promptFree && completionFree;
}
