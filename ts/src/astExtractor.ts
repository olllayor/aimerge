import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { ASTContext, CodeScope, FunctionInfo } from './types.js';

/**
 * Extracts AST-based context from code conflicts
 * Provides function/class definitions and structure instead of just raw lines
 */
export class ASTContextExtractor {
	/**
	 * Extract AST context for a conflict
	 */
	extractContext(filePath: string, currentCode: string, incomingCode: string, fullContent: string): ASTContext {
		const language = this.detectLanguage(filePath);
		const affectedSymbols = this.extractSymbols(currentCode, incomingCode);
		const surroundingFunctions = this.extractSurroundingFunctions(fullContent, currentCode);
		const imports = this.extractImports(fullContent);

		const currentScope = this.findCodeScope(fullContent, currentCode);
		const incomingScope = this.findCodeScope(fullContent, incomingCode);

		return {
			language,
			currentScope,
			incomingScope,
			affectedSymbols,
			surroundingFunctions,
			imports,
		};
	}

	/**
	 * Detect programming language from file extension
	 */
	private detectLanguage(filePath: string): ASTContext['language'] {
		const ext = extname(filePath).toLowerCase();
		switch (ext) {
			case '.ts':
			case '.tsx':
				return 'typescript';
			case '.js':
			case '.jsx':
			case '.mjs':
				return 'javascript';
			case '.py':
				return 'python';
			default:
				return 'unknown';
		}
	}

	/**
	 * Extract function/variable names from conflict code
	 */
	private extractSymbols(currentCode: string, incomingCode: string): string[] {
		const symbols = new Set<string>();
		const code = currentCode + '\n' + incomingCode;

		// Function definitions
		const functionPattern = /(?:function|const|let|var|def|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
		let match;
		while ((match = functionPattern.exec(code)) !== null) {
			symbols.add(match[1]);
		}

		// Function calls
		const callPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
		while ((match = callPattern.exec(code)) !== null) {
			const symbol = match[1];
			// Filter out common keywords
			if (!this.isKeyword(symbol)) {
				symbols.add(symbol);
			}
		}

		// Variable assignments
		const assignPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
		while ((match = assignPattern.exec(code)) !== null) {
			symbols.add(match[1]);
		}

		return Array.from(symbols);
	}

	/**
	 * Find functions/classes surrounding the conflict
	 */
	private extractSurroundingFunctions(fullContent: string, conflictCode: string): FunctionInfo[] {
		const functions: FunctionInfo[] = [];
		const lines = fullContent.split('\n');

		// Find the conflict position
		const conflictIndex = fullContent.indexOf(conflictCode);
		if (conflictIndex === -1) return functions;

		const conflictLine = fullContent.substring(0, conflictIndex).split('\n').length;

		// Look for function/class definitions near the conflict
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// JavaScript/TypeScript functions
			const jsFuncMatch =
				/(?:async\s+)?(?:function\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:=\s*)?\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/.exec(
					line,
				);
			if (jsFuncMatch) {
				const [, name, params, returnType] = jsFuncMatch;
				const funcCode = this.extractFunctionBody(lines, i);
				const funcStartLine = i + 1;
				const funcEndLine = i + funcCode.split('\n').length;

				// Include if function contains or is near the conflict
				if (funcStartLine <= conflictLine && conflictLine <= funcEndLine + 5) {
					functions.push({
						name,
						params: params
							.split(',')
							.map((p) => p.trim())
							.filter(Boolean),
						returnType: returnType?.trim(),
						code: funcCode,
					});
				}
			}

			// Python functions
			const pyFuncMatch = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?\s*:/.exec(line);
			if (pyFuncMatch) {
				const [, name, params, returnType] = pyFuncMatch;
				const funcCode = this.extractPythonFunctionBody(lines, i);
				const funcStartLine = i + 1;
				const funcEndLine = i + funcCode.split('\n').length;

				if (funcStartLine <= conflictLine && conflictLine <= funcEndLine + 5) {
					functions.push({
						name,
						params: params
							.split(',')
							.map((p) => p.trim())
							.filter(Boolean),
						returnType: returnType?.trim(),
						code: funcCode,
					});
				}
			}

			// Class definitions
			const classMatch = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/.exec(line);
			if (classMatch) {
				const name = classMatch[1];
				const classCode = this.extractClassBody(lines, i);
				const classStartLine = i + 1;
				const classEndLine = i + classCode.split('\n').length;

				if (classStartLine <= conflictLine && conflictLine <= classEndLine + 5) {
					functions.push({
						name: `class ${name}`,
						params: [],
						code: classCode,
					});
				}
			}
		}

		return functions;
	}

	/**
	 * Extract function body from JS/TS
	 */
	private extractFunctionBody(lines: string[], startLine: number): string {
		const result: string[] = [lines[startLine]];
		let braceCount = (lines[startLine].match(/\{/g) || []).length;
		braceCount -= (lines[startLine].match(/\}/g) || []).length;

		for (let i = startLine + 1; i < lines.length && i < startLine + 50; i++) {
			result.push(lines[i]);
			braceCount += (lines[i].match(/\{/g) || []).length;
			braceCount -= (lines[i].match(/\}/g) || []).length;

			if (braceCount <= 0) break;
		}

		return result.join('\n');
	}

	/**
	 * Extract Python function body
	 */
	private extractPythonFunctionBody(lines: string[], startLine: number): string {
		const result: string[] = [lines[startLine]];
		const baseIndent = lines[startLine].search(/\S/);

		for (let i = startLine + 1; i < lines.length && i < startLine + 50; i++) {
			const line = lines[i];
			const indent = line.search(/\S/);

			// Stop if we've de-indented back to or past the function level
			if (line.trim() && indent <= baseIndent) break;

			result.push(line);
		}

		return result.join('\n');
	}

	/**
	 * Extract class body
	 */
	private extractClassBody(lines: string[], startLine: number): string {
		// Similar to extractFunctionBody but for classes
		return this.extractFunctionBody(lines, startLine);
	}

	/**
	 * Find the scope (function/class/module) containing the conflict
	 */
	private findCodeScope(fullContent: string, conflictCode: string): CodeScope | undefined {
		const lines = fullContent.split('\n');
		const conflictIndex = fullContent.indexOf(conflictCode);
		if (conflictIndex === -1) return undefined;

		const conflictLine = fullContent.substring(0, conflictIndex).split('\n').length;

		// Search backwards for containing scope
		for (let i = conflictLine - 1; i >= 0; i--) {
			const line = lines[i];

			// Function scope
			const funcMatch = /(?:function|const|let|var|def|async)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/.exec(line);
			if (funcMatch) {
				const code = this.extractFunctionBody(lines, i);
				return {
					type: 'function',
					name: funcMatch[1],
					startLine: i + 1,
					endLine: i + code.split('\n').length,
					code,
				};
			}

			// Class scope
			const classMatch = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/.exec(line);
			if (classMatch) {
				const code = this.extractClassBody(lines, i);
				return {
					type: 'class',
					name: classMatch[1],
					startLine: i + 1,
					endLine: i + code.split('\n').length,
					code,
				};
			}
		}

		// Module-level scope
		return {
			type: 'module',
			startLine: 1,
			endLine: lines.length,
			code: fullContent,
		};
	}

	/**
	 * Extract imports from file
	 */
	private extractImports(content: string): string[] {
		const imports: string[] = [];

		// JS/TS imports
		const jsImportRegex = /^import\s+.*?from\s+['"]([^'"]+)['"]/gm;
		let match;
		while ((match = jsImportRegex.exec(content)) !== null) {
			imports.push(match[1]);
		}

		// Python imports
		const pyImportRegex = /^(?:from\s+([^\s]+)\s+)?import\s+(.+)$/gm;
		while ((match = pyImportRegex.exec(content)) !== null) {
			const module = match[1] || match[2].split(',')[0].trim();
			imports.push(module);
		}

		return [...new Set(imports)];
	}

	private isKeyword(word: string): boolean {
		const keywords = new Set([
			'if',
			'else',
			'for',
			'while',
			'return',
			'break',
			'continue',
			'function',
			'const',
			'let',
			'var',
			'class',
			'new',
			'this',
			'self',
			'import',
			'export',
			'from',
			'as',
			'default',
			'true',
			'false',
			'null',
			'undefined',
			'None',
			'True',
			'False',
			'async',
			'await',
			'try',
			'catch',
			'finally',
			'throw',
			'switch',
			'case',
			'default',
			'do',
			'typeof',
			'instanceof',
		]);
		return keywords.has(word);
	}
}

/**
 * Build enhanced prompt with AST context
 */
export function buildASTEnhancedPrompt(
	conflict: { current: string; incoming: string; context: string },
	astContext: ASTContext,
): string {
	let prompt = 'ENHANCED CONTEXT (AST Analysis):\n\n';

	// Language info
	prompt += `Language: ${astContext.language}\n\n`;

	// Affected symbols
	if (astContext.affectedSymbols.length > 0) {
		prompt += `Symbols involved: ${astContext.affectedSymbols.join(', ')}\n\n`;
	}

	// Imports
	if (astContext.imports.length > 0) {
		prompt += `Imported modules: ${astContext.imports.slice(0, 5).join(', ')}\n\n`;
	}

	// Current scope
	if (astContext.currentScope) {
		prompt += `Current scope: ${astContext.currentScope.type}`;
		if (astContext.currentScope.name) {
			prompt += ` "${astContext.currentScope.name}"`;
		}
		prompt += '\n\n';
	}

	// Surrounding functions
	if (astContext.surroundingFunctions.length > 0) {
		prompt += 'Related functions/classes:\n';
		for (const func of astContext.surroundingFunctions.slice(0, 3)) {
			prompt += `\n${func.name}(${func.params.join(', ')})`;
			if (func.returnType) {
				prompt += `: ${func.returnType}`;
			}
			prompt += '\n```\n';
			// Include just the signature or first few lines
			const codeLines = func.code.split('\n');
			prompt += codeLines.slice(0, Math.min(5, codeLines.length)).join('\n');
			if (codeLines.length > 5) {
				prompt += '\n  // ... (truncated)';
			}
			prompt += '\n```\n';
		}
		prompt += '\n';
	}

	return prompt;
}
