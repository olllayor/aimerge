import { describe, it, expect } from 'vitest';
import { classifyConflict, shouldAutoResolve, isDangerous, autoResolveTrivial } from '../src/conflictClassifier.js';
import { ConflictBlock } from '../src/types.js';

describe('conflictClassifier', () => {
	describe('classifyConflict', () => {
		it('should classify whitespace-only conflicts as trivial', () => {
			const conflict: ConflictBlock = {
				current: 'const x = 1;',
				incoming: 'const x = 1; ',
				context: '',
				fullMatch: '<<<<<<< HEAD\nconst x = 1;\n=======\nconst x = 1; \n>>>>>>> branch\n',
				filePath: 'test.ts',
			};
			expect(classifyConflict(conflict)).toBe('trivial');
		});

		it('should classify comment-only conflicts as trivial', () => {
			const conflict: ConflictBlock = {
				current: '// Comment A\nconst x = 1;',
				incoming: '// Comment B\nconst x = 1;',
				context: '',
				fullMatch: '<<<<<<< HEAD\n// Comment A\nconst x = 1;\n=======\n// Comment B\nconst x = 1;\n>>>>>>> branch\n',
				filePath: 'test.ts',
			};
			expect(classifyConflict(conflict)).toBe('trivial');
		});

		it('should classify import reordering as trivial', () => {
			const conflict: ConflictBlock = {
				current: "import { a } from 'a';\nimport { b } from 'b';",
				incoming: "import { b } from 'b';\nimport { a } from 'a';",
				context: '',
				fullMatch:
					"<<<<<<< HEAD\nimport { a } from 'a';\nimport { b } from 'b';\n=======\nimport { b } from 'b';\nimport { a } from 'a';\n>>>>>>> branch\n",
				filePath: 'test.ts',
			};
			expect(classifyConflict(conflict)).toBe('trivial');
		});

		it('should classify variable value conflicts as logic-collision', () => {
			const conflict: ConflictBlock = {
				current: 'const x = 1;',
				incoming: 'const x = 2;',
				context: '',
				fullMatch: '<<<<<<< HEAD\nconst x = 1;\n=======\nconst x = 2;\n>>>>>>> branch\n',
				filePath: 'test.ts',
			};
			expect(classifyConflict(conflict)).toBe('logic-collision');
		});

		it('should classify function redefinitions as logic-collision', () => {
			const conflict: ConflictBlock = {
				current: 'function foo() { return 1; }',
				incoming: 'function foo() { return 2; }',
				context: '',
				fullMatch:
					'<<<<<<< HEAD\nfunction foo() { return 1; }\n=======\nfunction foo() { return 2; }\n>>>>>>> branch\n',
				filePath: 'test.ts',
			};
			expect(classifyConflict(conflict)).toBe('logic-collision');
		});

		it('should classify return value conflicts as logic-collision', () => {
			const conflict: ConflictBlock = {
				current: 'return true;',
				incoming: 'return false;',
				context: '',
				fullMatch: '<<<<<<< HEAD\nreturn true;\n=======\nreturn false;\n>>>>>>> branch\n',
				filePath: 'test.ts',
			};
			expect(classifyConflict(conflict)).toBe('logic-collision');
		});

		it('should classify control flow conflicts as logic-collision', () => {
			const conflict: ConflictBlock = {
				current: 'if (x) { doA(); }',
				incoming: 'if (!x) { doB(); }',
				context: '',
				fullMatch: '<<<<<<< HEAD\nif (x) { doA(); }\n=======\nif (!x) { doB(); }\n>>>>>>> branch\n',
				filePath: 'test.ts',
			};
			expect(classifyConflict(conflict)).toBe('logic-collision');
		});
	});

	describe('shouldAutoResolve', () => {
		it('should return true for trivial classification', () => {
			expect(shouldAutoResolve('trivial')).toBe(true);
		});

		it('should return false for semantic classification', () => {
			expect(shouldAutoResolve('semantic')).toBe(false);
		});

		it('should return false for logic-collision classification', () => {
			expect(shouldAutoResolve('logic-collision')).toBe(false);
		});
	});

	describe('isDangerous', () => {
		it('should return false for trivial classification', () => {
			expect(isDangerous('trivial')).toBe(false);
		});

		it('should return false for semantic classification', () => {
			expect(isDangerous('semantic')).toBe(false);
		});

		it('should return true for logic-collision classification', () => {
			expect(isDangerous('logic-collision')).toBe(true);
		});
	});

	describe('autoResolveTrivial', () => {
		it('should resolve whitespace conflicts by keeping non-whitespace version', () => {
			const conflict: ConflictBlock = {
				current: 'const x = 1;',
				incoming: 'const x = 1; ',
				context: '',
				fullMatch: '<<<<<<< HEAD\nconst x = 1;\n=======\nconst x = 1; \n>>>>>>> branch\n',
				filePath: 'test.ts',
			};
			const resolution = autoResolveTrivial(conflict);
			expect(resolution).toBeDefined();
			expect(resolution?.trim()).toBe('const x = 1;');
		});

		it('should resolve comment conflicts by keeping both comments', () => {
			const conflict: ConflictBlock = {
				current: '// Comment A\nconst x = 1;',
				incoming: '// Comment B\nconst x = 1;',
				context: '',
				fullMatch: '<<<<<<< HEAD\n// Comment A\nconst x = 1;\n=======\n// Comment B\nconst x = 1;\n>>>>>>> branch\n',
				filePath: 'test.ts',
			};
			const resolution = autoResolveTrivial(conflict);
			expect(resolution).toBeDefined();
			expect(resolution).toContain('Comment A');
			expect(resolution).toContain('Comment B');
		});

		it('should return null for non-trivial conflicts', () => {
			const conflict: ConflictBlock = {
				current: 'const x = 1;',
				incoming: 'const x = 2;',
				context: '',
				fullMatch: '<<<<<<< HEAD\nconst x = 1;\n=======\nconst x = 2;\n>>>>>>> branch\n',
				filePath: 'test.ts',
			};
			expect(autoResolveTrivial(conflict)).toBeNull();
		});
	});
});
