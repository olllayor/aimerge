import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/openrouter.js', async () => {
	const actual = await vi.importActual<typeof import('../src/openrouter.js')>('../src/openrouter.js');
	return {
		...actual,
		fetchFreeModels: vi.fn(),
		requestCompletion: vi.fn().mockResolvedValue('resolved'),
	};
});

import { createOpenRouterResolver } from '../src/resolver.js';
import { fetchFreeModels } from '../src/openrouter.js';

const mockedFetchFreeModels = vi.mocked(fetchFreeModels);

describe('createOpenRouterResolver', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('falls back to first free model when preferred missing', async () => {
		mockedFetchFreeModels.mockResolvedValue([{ id: 'free-model', name: 'Free Model', contextLength: 100_000 }]);

		const result = await createOpenRouterResolver({
			apiKey: 'test-key',
			preferredModelId: 'missing-model',
		});

		expect(result.model.id).toBe('free-model');
		expect(result.preferredModelFallback).toEqual({ requestedId: 'missing-model' });
	});

	it('uses preferred model when available', async () => {
		mockedFetchFreeModels.mockResolvedValue([
			{ id: 'preferred', name: 'Preferred', contextLength: 10_000 },
			{ id: 'other', name: 'Other', contextLength: 5_000 },
		]);

		const result = await createOpenRouterResolver({
			apiKey: 'test-key',
			preferredModelId: 'preferred',
		});

		expect(result.model.id).toBe('preferred');
		expect(result.preferredModelFallback).toBeUndefined();
	});
});
