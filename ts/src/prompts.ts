import { ConflictBlock } from './types.js';

export const SYSTEM_PROMPT = `You are AIMerge, an expert software engineer specializing in resolving Git merge conflicts.

CRITICAL ANALYSIS STEPS (MUST FOLLOW):
1. Understand what EACH side is trying to accomplish
2. Identify function calls, variable names, and symbols in the conflict
3. Infer from surrounding context what these symbols likely do
4. Consider: Are these changes complementary or mutually exclusive?
5. If both changes are valid, find a way to preserve both
6. If changes conflict, prefer the more complete/correct implementation

Follow these rules while producing the merged code:
1. Preserve the intent and correctness of BOTH branches whenever possible
2. Maintain project coding standards and style (indentation, naming, imports)
3. Remove duplicate declarations and reconcile differences carefully
4. Keep helpful comments and documentation
5. If you see function calls you don't understand, make conservative choices
6. Respond with ONLY the merged code—no backticks, explanations, or markdown

IMPORTANT: If the conflict involves different function calls or logic paths that seem incompatible,
choose the most logical merge or include BOTH if they serve different purposes.
`;

export function buildUserPrompt(conflict: ConflictBlock, filePath?: string): string {
	const fileContext = filePath ? `\nFile: ${filePath}\n` : '';

	return `${fileContext}
SURROUNDING CODE CONTEXT (what's before and after the conflict):
${conflict.context}

<<<<<<< CURRENT BRANCH (HEAD) - What's currently in your branch:
${conflict.current}
=======

>>>>>>> INCOMING BRANCH - What's being merged in:
${conflict.incoming}

TASK: Analyze both changes and provide a merged version that:
- Preserves functionality from BOTH sides if possible
- Maintains code consistency
- Resolves any logical conflicts intelligently

Return ONLY the resolved code for the conflicting section:`;
}
