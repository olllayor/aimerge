export interface ConflictBlock {
	current: string;
	incoming: string;
	context: string;
	fullMatch: string;
	filePath?: string;
	classification?: ConflictClassification;
	astContext?: ASTContext;
}

export type ConflictClassification = 'trivial' | 'semantic' | 'logic-collision' | 'unknown';

export interface ASTContext {
	language: 'typescript' | 'javascript' | 'python' | 'unknown';
	currentScope?: CodeScope;
	incomingScope?: CodeScope;
	affectedSymbols: string[];
	surroundingFunctions: FunctionInfo[];
	imports: string[];
}

export interface CodeScope {
	type: 'function' | 'class' | 'method' | 'module' | 'block';
	name?: string;
	startLine: number;
	endLine: number;
	code: string;
}

export interface FunctionInfo {
	name: string;
	params: string[];
	returnType?: string;
	code: string;
}

export interface ConfidenceScore {
	score: number; // 0-1
	level: 'high' | 'medium' | 'low';
	reasons: string[];
	requiresApproval: boolean;
}

export interface ResolveOptions {
	auto: boolean;
	interactive: boolean;
	model?: string;
	autoResolveTrivial?: boolean; // New: auto-resolve trivial conflicts
	minConfidence?: number; // New: minimum confidence for auto-accept (0-1)
}

export interface ResolutionStats {
	resolved: number;
	skipped: number;
	autoResolved?: number; // New: count of trivial auto-resolutions
	flagged?: number; // New: count of dangerous conflicts flagged
}

export interface ResolutionResult {
	resolution: string;
	confidence?: ConfidenceScore;
}

export interface ModelInfo {
	id: string;
	name: string;
	contextLength: number;
}
