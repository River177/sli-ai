/**
 * Enhance Command
 * Edit and enhance a specific slide
 */

import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import {
  createOrchestrator,
  getConfigFromEnv,
  parseSlidev,
  stringifySlidev,
  updateSlide,
  type EnhanceOptions,
} from '@slidev-ai/core';

export interface EnhanceCommandOptions {
  autoFix?: boolean;
  maxIterations?: string;
}

export async function enhanceCommand(
  file: string,
  index: string,
  instruction: string,
  options: EnhanceCommandOptions
): Promise<void> {
  const spinner = ora('Reading file...').start();

  try {
    // Parse slide index
    const slideIndex = parseInt(index, 10);
    if (isNaN(slideIndex) || slideIndex < 0) {
      spinner.fail(chalk.red('Invalid slide index'));
      console.error(chalk.gray('Slide index must be a non-negative integer'));
      process.exit(1);
    }

    // Read file
    const filePath = resolve(process.cwd(), file);
    const content = await readFile(filePath, 'utf-8');
    const deck = parseSlidev(content);

    // Validate slide index
    if (slideIndex >= deck.slides.length) {
      spinner.fail(chalk.red(`Slide ${slideIndex} not found`));
      console.error(chalk.gray(`File has ${deck.slides.length} slides (0-${deck.slides.length - 1})`));
      process.exit(1);
    }

    // Get AI config
    const config = getConfigFromEnv();
    const orchestrator = createOrchestrator(config);

    // Prepare enhance options
    const enhanceOptions: EnhanceOptions = {
      instruction,
      autoFix: options.autoFix !== false,
      maxIterations: options.maxIterations ? parseInt(options.maxIterations, 10) : 3,
    };

    spinner.text = `Enhancing slide ${slideIndex}...`;

    // Edit slide with feedback
    const result = await orchestrator.editSlideWithFeedback(
      deck,
      slideIndex,
      enhanceOptions
    );

    if (!result.success) {
      spinner.fail(chalk.red('Failed to enhance slide'));
      console.error(chalk.red(result.error || 'Unknown error'));
      process.exit(1);
    }

    // Update deck
    const updatedDeck = updateSlide(deck, slideIndex, result.content);
    const markdown = stringifySlidev(updatedDeck);

    // Write file
    spinner.text = 'Writing file...';
    await writeFile(filePath, markdown, 'utf-8');

    spinner.succeed(chalk.green('Slide enhanced successfully!'));

    // Display summary
    console.log('');
    console.log(chalk.cyan('📝 Enhancement Summary:'));
    console.log(`   ${chalk.white('File:')} ${file}`);
    console.log(`   ${chalk.white('Slide:')} ${slideIndex}`);
    console.log(`   ${chalk.white('Instruction:')} ${instruction}`);
    console.log(`   ${chalk.white('Iterations:')} ${result.iterations}`);

    // Display remaining issues
    if (result.layoutIssues.length > 0) {
      console.log('');
      console.log(chalk.yellow(`⚠️  ${result.layoutIssues.length} layout issue(s) remain:`));
      result.layoutIssues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        console.log(`   ${icon} ${issue.message}`);
      });
    } else {
      console.log('');
      console.log(chalk.green('✅ No layout issues detected'));
    }

    // Show preview of updated content
    console.log('');
    console.log(chalk.gray('Updated content preview:'));
    console.log(chalk.gray('─'.repeat(50)));
    const preview = result.content.split('\n').slice(0, 10).join('\n');
    console.log(preview);
    if (result.content.split('\n').length > 10) {
      console.log(chalk.gray('...'));
    }
    console.log(chalk.gray('─'.repeat(50)));

  } catch (error) {
    spinner.fail(chalk.red('Error enhancing slide'));
    
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        console.error(chalk.red(`\n❌ File not found: ${file}`));
      } else if (error.message.includes('OPENAI_API_KEY')) {
        console.error(chalk.red('\n❌ OpenAI API key not set'));
        console.error(chalk.gray('Set the OPENAI_API_KEY environment variable'));
      } else {
        console.error(chalk.red(`\n${error.message}`));
      }
    }
    
    process.exit(1);
  }
}

