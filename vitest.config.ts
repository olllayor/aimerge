import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['ts/tests/**/*.test.ts'],
		globals: true,
		clearMocks: true,
	},
});
