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
} from './config.js';
import { ConflictBlock, ModelInfo, ResolveOptions, ResolutionStats } from './types.js';

const MODEL_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

const program = new Command();

program
	.name('aimerge')
	.description('AI-assisted Git merge conflict resolver')
	.option('--auto', 'Auto-accept resolutions without confirmation', false)
	.option('--model <modelId>', 'Use a specific OpenRouter model identifier')
	.option('--interactive', 'Review each resolution interactively', true)
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
			const { model, resolver, fromCache } = await createOpenRouterResolver({
				apiKey,
				preferredModelId: preferredModel,
				cachedModels,
				onModelsFetched: saveModelCache,
			});
			modelSpinner.succeed(`Using ${model.name} (context ${model.contextLength.toLocaleString()} tokens)`);
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
		showSummary(stats.resolved, stats.skipped, conflicts.length);
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
	const stats: ResolutionStats = { resolved: 0, skipped: 0 };

	for (let index = 0; index < conflicts.length; index += 1) {
		const conflict = conflicts[index];
		const resolution = await withThinkingSpinner(
			`🤖 Resolving conflict ${index + 1}/${conflicts.length} with ${model.name}`,
			async () => {
				const outcome = await resolver({ conflict, model });
				return outcome.resolution;
			},
		);

		let decision = options.auto || !options.interactive ? 'y' : '';

		if (options.interactive) {
			showConflict(conflict, index + 1, conflicts.length);
			console.log(chalk.green('💡 AI Resolution:'));
			await renderAiMessage(resolution);
			decision = await askForDecision('y');
		}

		switch (decision) {
			case 'y':
				content = applyResolution(content, conflict.fullMatch, resolution);
				stats.resolved += 1;
				break;
			case 'e': {
				const edited = await openInEditor(resolution);
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
	return content.replace(marker, `${resolution}\n`);
}
