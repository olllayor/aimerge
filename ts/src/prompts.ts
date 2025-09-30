import { ConflictBlock } from './types.js';

export const SYSTEM_PROMPT = `You are AIMerge, an expert software engineer specializing in resolving Git merge conflicts.
Follow these rules while producing the merged code:
1. Preserve the intent and correctness of BOTH branches.
2. Maintain project coding standards and style (indentation, naming, imports).
3. Remove duplicate declarations and reconcile differences carefully.
4. Keep helpful comments and documentation.
5. Respond with ONLY the merged code—no backticks, explanations, or markdown.
`;

export function buildUserPrompt(conflict: ConflictBlock): string {
	return `Project context (surrounding code):\n${conflict.context}\n\nCurrent branch changes:\n${conflict.current}\n\nIncoming branch changes:\n${conflict.incoming}\n\nReturn the resolved version:`;
}
