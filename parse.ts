interface Model {
	id: string;
	name: string;
	pricing?: { prompt?: string | number; completion?: string | number };
	top_provider?: { context_length: number; max_completion_tokens: number | null; is_moderated: boolean };
}

async function getFreeModels(): Promise<Model[]> {
	try {
		const res = await fetch('https://openrouter.ai/api/v1/models');
		if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
		const { data } = await res.json();

		return data.filter((m: Model) => {
			const p = m.pricing;
			if (!p) return false;

			// Must have both prompt AND completion at exactly 0
			const promptFree = p.prompt === '0' || p.prompt === 0;
			const completionFree = p.completion === '0' || p.completion === 0;

			return promptFree && completionFree;
		});
	} catch (error) {
		console.error('Error fetching models:', error);
		return [];
	}
}

(async () => {
	const models = await getFreeModels();
	console.log(`Found ${models.length} free models\n`);

	const top3 = models
		.sort((a, b) => (b.top_provider?.context_length || 0) - (a.top_provider?.context_length || 0))
		.slice(0, 3)
		.map((m) => ({
			id: m.id,
			name: m.name,
			context_length: m.top_provider?.context_length || 0,
		}));

	return top3;
})();
