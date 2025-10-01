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
SURROUNDING CODE CONTEXT (for reference only, DO NOT include in your response):
${conflict.context}

THE ACTUAL CONFLICT TO RESOLVE:
<<<<<<< CURRENT BRANCH (HEAD) - What's currently in your branch:
${conflict.current}
=======
>>>>>>> INCOMING BRANCH - What's being merged in:
${conflict.incoming}

CRITICAL INSTRUCTIONS:
1. Analyze BOTH changes and determine the best merge strategy
2. Return ONLY the code that should REPLACE the conflict markers (between <<<<<<< and >>>>>>>)
3. DO NOT include the surrounding context lines in your response
4. DO NOT include the conflict markers themselves (<<<<<<, =======, >>>>>>>)
5. If both changes can coexist, include both in a logical order
6. Preserve correct indentation and formatting

Return the merged code now:`;
}
