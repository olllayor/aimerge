export interface ConflictBlock {
	current: string;
	incoming: string;
	context: string;
	fullMatch: string;
	filePath?: string;
}

export interface ResolveOptions {
	auto: boolean;
	interactive: boolean;
	model?: string;
}

export interface ResolutionStats {
	resolved: number;
	skipped: number;
}

export interface ModelInfo {
	id: string;
	name: string;
	contextLength: number;
}
