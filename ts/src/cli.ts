#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { parseConflicts } from './conflictParser.js';
import { assertGitRepository, findConflictedFiles, stageFile } from './git.js';
import { backupFile, openInEditor, overwriteFile, readFile, restoreBackup, safeRemove } from './fileUtils.js';
import {
	askForDecision,
	banner,
	listConflictedFiles,
	showConflict,
	showConflictSummary,
	showError,
	showSummary,
} from './ui.js';
import { createOpenRouterResolver, Resolver } from './resolver.js';
import { withThinkingSpinner, renderAiMessage } from './aiUi.js';
import {
	loadRuntimeConfig,
	loadModelCache,
	saveModelCache,
	savePreferredModel,
	saveApiKey,
	getStoredConfig,
	clearModelCache,
	clearPreferredModel,
} from './config.js';
import { ConflictBlock, ModelInfo, ResolveOptions, ResolutionStats } from './types.js';
import { shouldAutoResolve, autoResolveTrivial, isDangerous } from './conflictClassifier.js';
import { formatConfidence } from './confidenceScorer.js';

const MODEL_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

const program = new Command();

program
	.name('aimerge')
	.description('AI-assisted Git merge conflict resolver')
	.option('--auto', 'Auto-accept resolutions without confirmation', false)
	.option('--model <modelId>', 'Use a specific OpenRouter model identifier')
	.option('--interactive', 'Review each resolution interactively', true)
	.option('--auto-resolve-trivial', 'Automatically resolve trivial conflicts (whitespace, comments, imports)', true)
	.option('--min-confidence <number>', 'Minimum confidence score (0-1) to auto-accept', parseFloat, 0.7)
	.action(async (options: ResolveOptions) => {
		try {
			banner();
			assertGitRepository();

			const conflictedFiles = findConflictedFiles();
			listConflictedFiles(conflictedFiles);
			if (!conflictedFiles.length) {
				return;
			}

			const runtime = loadRuntimeConfig();
			const apiKey = runtime.apiKey;
			const preferredModel = options.model ?? runtime.preferredModel;

			if (!apiKey) {
				throw new Error("OpenRouter API key not found. Set OPENROUTER_API_KEY or run 'aimerge config set-key'.");
			}

			const modelSpinner = ora('Selecting best free OpenRouter model…').start();
			const cachedModels = loadModelCache(MODEL_CACHE_TTL_MS);
			const { model, resolver, fromCache, preferredModelFallback } = await createOpenRouterResolver({
				apiKey,
				preferredModelId: preferredModel,
				cachedModels,
				onModelsFetched: saveModelCache,
			});
			modelSpinner.succeed(`Using ${model.name} (context ${model.contextLength.toLocaleString()} tokens)`);
			if (preferredModelFallback) {
				console.log(
					chalk.yellow(
						`Preferred model ${preferredModelFallback.requestedId} is unavailable among free models. Falling back to ${model.id}.`,
					),
				);
				if (
					!options.model &&
					!process.env.AIMERGE_MODEL &&
					runtime.preferredModel === preferredModelFallback.requestedId
				) {
					const stored = getStoredConfig();
					if (stored.preferredModel === preferredModelFallback.requestedId) {
						clearPreferredModel();
						console.log(chalk.gray('Stored preferred model cleared from config.'));
					}
				}
			}
			if (fromCache) {
				console.log(chalk.gray('Model list loaded from cache.'));
			}
			console.log(chalk.gray(`Model id: ${model.id}`));

			if (options.model) {
				savePreferredModel(model.id);
			}

			for (const filePath of conflictedFiles) {
				await processFile(filePath, options, resolver, model);
			}
		} catch (error) {
			showError(error);
			process.exitCode = 1;
		}
	});

const configCommand = program.command('config').description('Manage AIMerge configuration');

configCommand
	.command('set-key <apiKey>')
	.description('Store your OpenRouter API key for future runs')
	.action((apiKey: string) => {
		saveApiKey(apiKey);
		console.log(chalk.green('✅ API key saved.'));
	});

configCommand
	.command('show')
	.description('Display current configuration values')
	.action(() => {
		const stored = getStoredConfig();
		const runtime = loadRuntimeConfig();
		console.log(chalk.blue('Stored configuration:'));
		console.log(JSON.stringify({ stored, active: runtime }, null, 2));
	});

configCommand
	.command('use-model <modelId>')
	.description('Set a preferred OpenRouter model for future runs')
	.action((modelId: string) => {
		savePreferredModel(modelId);
		console.log(chalk.green(`✅ Preferred model set to ${modelId}.`));
	});

configCommand
	.command('clear-cache')
	.description('Clear cached OpenRouter model metadata')
	.action(() => {
		clearModelCache();
		console.log(chalk.green('🧹 Cleared model cache.'));
	});

program.parseAsync();

async function processFile(
	filePath: string,
	options: ResolveOptions,
	resolver: Resolver,
	model: ModelInfo,
): Promise<void> {
	const backupPath = backupFile(filePath);
	const conflicts = parseConflicts(filePath);
	showConflictSummary(filePath, conflicts.length);

	if (conflicts.length === 0) {
		console.log(chalk.yellow('  ➤ No conflict markers found'));
		return;
	}

	const originalContent = readFile(filePath);

	try {
		const { content, stats } = await resolveConflictsInFile(originalContent, conflicts, options, resolver, model);

		overwriteFile(filePath, content);
		stageFile(filePath);
		showSummary(stats.resolved, stats.skipped, conflicts.length, stats.autoResolved);
		console.log(chalk.green(`✅ Resolved and staged ${filePath}`));
		safeRemove(backupPath);
	} catch (error) {
		restoreBackup(backupPath, filePath);
		throw error;
	}
}

async function resolveConflictsInFile(
	fileContent: string,
	conflicts: ConflictBlock[],
	options: ResolveOptions,
	resolver: Resolver,
	model: ModelInfo,
): Promise<{ content: string; stats: ResolutionStats }> {
	let content = fileContent;
	const stats: ResolutionStats = { resolved: 0, skipped: 0, autoResolved: 0 };

	for (let index = 0; index < conflicts.length; index += 1) {
		const conflict = conflicts[index];
		const classification = conflict.classification!;

		// Display classification
		console.log(chalk.cyan(`\n🔍 Conflict ${index + 1}/${conflicts.length}: ${classification.toUpperCase()}`));

		// Show warning for dangerous conflicts
		if (isDangerous(classification)) {
			console.log(chalk.red('⚠️  WARNING: This is a potentially dangerous conflict that requires careful review!'));
		}

		// Try auto-resolution for trivial conflicts
		if (shouldAutoResolve(classification) && options.autoResolveTrivial !== false) {
			const trivialResolution = autoResolveTrivial(conflict);
			if (trivialResolution) {
				console.log(chalk.green('✨ Auto-resolved trivial conflict'));
				content = applyResolution(content, conflict.fullMatch, trivialResolution);
				stats.autoResolved = (stats.autoResolved || 0) + 1;
				stats.resolved += 1;
				continue;
			}
		}

		const result = await withThinkingSpinner(
			`🤖 Resolving conflict ${index + 1}/${conflicts.length} with ${model.name}`,
			async () => {
				return await resolver({ conflict, model });
			},
		);

		// Validate resolution is not empty
		if (!result.resolution || !result.resolution.trim()) {
			console.log(chalk.yellow(`⚠️ AI returned empty resolution for conflict ${index + 1}, skipping...`));
			stats.skipped += 1;
			continue;
		}

		// Display confidence score
		if (result.confidence) {
			console.log(formatConfidence(result.confidence));

			// Require approval for low confidence or dangerous conflicts
			if (result.confidence.requiresApproval || isDangerous(classification)) {
				options.interactive = true;
				options.auto = false;
			}
		}

		let decision = options.auto || !options.interactive ? 'y' : '';

		if (options.interactive) {
			showConflict(conflict, index + 1, conflicts.length);
			console.log(chalk.green('💡 AI Resolution:'));
			await renderAiMessage(result.resolution);
			decision = await askForDecision('y');
		}

		switch (decision) {
			case 'y':
				content = applyResolution(content, conflict.fullMatch, result.resolution);
				stats.resolved += 1;
				break;
			case 'e': {
				const edited = await openInEditor(result.resolution);
				if (edited) {
					content = applyResolution(content, conflict.fullMatch, edited);
					stats.resolved += 1;
				} else {
					stats.skipped += 1;
				}
				break;
			}
			case 's':
			case 'n':
			default:
				stats.skipped += 1;
				break;
		}
	}

	return { content, stats };
}

function applyResolution(content: string, marker: string, resolution: string): string {
	// Use indexOf to ensure we only replace the specific occurrence
	const index = content.indexOf(marker);
	if (index === -1) {
		throw new Error('Conflict marker not found in content');
	}
	return content.slice(0, index) + `${resolution}\n` + content.slice(index + marker.length);
}
