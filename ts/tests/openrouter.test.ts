import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFreeModels, pickModel, requestCompletion } from '../src/openrouter.js';
import { ConflictBlock } from '../src/types.js';

describe('openrouter integration', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('filters free models and sorts by context length', async () => {
		const mockResponse = {
			ok: true,
			json: async () => ({
				data: [
					{
						id: 'model-paid',
						name: 'Paid Model',
						pricing: { prompt: 0.001, completion: 0.001 },
						top_provider: { context_length: 32_000 },
					},
					{
						id: 'model-free',
						name: 'Free Model',
						pricing: { prompt: 0, completion: '0' },
						top_provider: { context_length: 128_000 },
					},
				],
			}),
		};

		globalThis.fetch = vi.fn().mockResolvedValue(mockResponse as Response);

		const models = await fetchFreeModels();
		expect(models).toHaveLength(1);
		expect(models[0]).toMatchObject({ id: 'model-free', contextLength: 128_000 });
	});

	it('selects preferred model if available', () => {
		const models = [
			{ id: 'a', name: 'Model A', contextLength: 1_000 },
			{ id: 'b', name: 'Model B', contextLength: 2_000 },
		];

		expect(pickModel(models, 'b')).toMatchObject({ id: 'b' });
		expect(() => pickModel(models, 'missing')).toThrowError(/not available/);
	});

	it('extracts text content from chat completions', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [
					{
						message: {
							role: 'assistant',
							content: [{ type: 'text', text: 'Resolved code' }],
						},
					},
				],
			}),
		});

		globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

		const conflict: ConflictBlock = {
			current: "print('current')",
			incoming: "print('incoming')",
			context: 'context',
			fullMatch: '',
		};

		const result = await requestCompletion('api-key', 'model-id', conflict);
		expect(result).toBe('Resolved code');
		expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('chat/completions'), expect.any(Object));
	});
});
