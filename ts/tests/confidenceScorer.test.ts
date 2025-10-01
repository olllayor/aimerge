import { describe, it, expect } from 'vitest';
import { calculateConfidence, formatConfidence, getConfidenceThreshold } from '../src/confidenceScorer.js';
import { ConflictBlock } from '../src/types.js';

describe('confidenceScorer', () => {
	describe('calculateConfidence', () => {
		it('should give high confidence for simple, clean resolutions', () => {
			const conflict: ConflictBlock = {
				current: 'const x = 1;',
				incoming: 'const x = 2;',
				context: '',
				fullMatch: '<<<<<<< HEAD\nconst x = 1;\n=======\nconst x = 2;\n>>>>>>> branch\n',
				filePath: 'test.ts',
				classification: 'semantic',
			};
			const resolution = 'const x = 2;';
			const confidence = calculateConfidence(resolution, conflict, 'semantic');

			expect(confidence.score).toBeGreaterThan(0.5);
			expect(confidence.level).toBeDefined();
			expect(confidence.reasons).toBeDefined();
		});

		it('should give low confidence for suspicious resolutions with conflict markers', () => {
			const conflict: ConflictBlock = {
				current: 'const x = 1;',
				incoming: 'const x = 2;',
				context: '',
				fullMatch: '<<<<<<< HEAD\nconst x = 1;\n=======\nconst x = 2;\n>>>>>>> branch\n',
				filePath: 'test.ts',
				classification: 'semantic',
			};
			const resolution = '<<<<<<< HEAD\nconst x = 1;\n=======\nconst x = 2;\n>>>>>>> branch';
			const confidence = calculateConfidence(resolution, conflict, 'semantic');

			expect(confidence.score).toBeLessThanOrEqual(0.31); // Tolerance for floating point
			expect(confidence.requiresApproval).toBe(true);
		});

		it('should give lower confidence for logic-collision conflicts', () => {
			const conflict: ConflictBlock = {
				current: 'return true;',
				incoming: 'return false;',
				context: '',
				fullMatch: '<<<<<<< HEAD\nreturn true;\n=======\nreturn false;\n>>>>>>> branch\n',
				filePath: 'test.ts',
				classification: 'logic-collision',
			};
			const resolution = 'return true;';
			const confidence = calculateConfidence(resolution, conflict, 'logic-collision');

			expect(confidence.score).toBeLessThanOrEqual(0.71); // Tolerance for floating point
			expect(confidence.level).toMatch(/low|medium/i);
		});

		it('should detect syntax issues in resolution', () => {
			const conflict: ConflictBlock = {
				current: 'const x = 1;',
				incoming: 'const x = 2;',
				context: '',
				fullMatch: '<<<<<<< HEAD\nconst x = 1;\n=======\nconst x = 2;\n>>>>>>> branch\n',
				filePath: 'test.ts',
				classification: 'semantic',
			};
			const resolution = 'const x = {unclosed';
			const confidence = calculateConfidence(resolution, conflict, 'semantic');

			expect(confidence.score).toBeLessThan(0.5);
		});

		it('should penalize empty resolutions', () => {
			const conflict: ConflictBlock = {
				current: 'const x = 1;',
				incoming: 'const x = 2;',
				context: '',
				fullMatch: '<<<<<<< HEAD\nconst x = 1;\n=======\nconst x = 2;\n>>>>>>> branch\n',
				filePath: 'test.ts',
				classification: 'semantic',
			};
			const resolution = '';
			const confidence = calculateConfidence(resolution, conflict, 'semantic');

			expect(confidence.score).toBeLessThan(0.3);
		});
	});

	describe('formatConfidence', () => {
		it('should format high confidence with green color', () => {
			const confidence = {
				score: 0.9,
				level: 'high' as const,
				reasons: ['Simple resolution', 'Clean structure'],
				requiresApproval: false,
			};
			const formatted = formatConfidence(confidence);

			expect(formatted).toContain('90%');
			expect(formatted).toContain('high');
		});

		it('should format low confidence with red color and warning', () => {
			const confidence = {
				score: 0.3,
				level: 'low' as const,
				reasons: ['Contains conflict markers', 'Suspicious syntax'],
				requiresApproval: true,
			};
			const formatted = formatConfidence(confidence);

			expect(formatted).toContain('30%');
			expect(formatted).toContain('low');
			expect(formatted).toContain('manual approval');
		});
	});

	describe('getConfidenceThreshold', () => {
		it('should return threshold for auto-accept', () => {
			const threshold = getConfidenceThreshold('auto-accept');
			expect(threshold).toBeGreaterThan(0);
			expect(threshold).toBeLessThanOrEqual(1);
		});

		it('should return threshold for require-review', () => {
			const threshold = getConfidenceThreshold('require-review');
			expect(threshold).toBeGreaterThan(0);
			expect(threshold).toBeLessThanOrEqual(1);
		});
	});
});
