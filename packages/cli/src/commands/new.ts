/**
 * New Command
 * Generate a new Slidev presentation
 */

import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import {
  createOrchestrator,
  getConfigFromEnv,
  type GenerateOptions,
} from '@slidev-ai/core';

export interface NewCommandOptions {
  slides?: string;
  theme?: string;
  language?: string;
  style?: 'professional' | 'casual' | 'academic' | 'creative';
  output?: string;
  notes?: boolean;
}

export async function newCommand(
  topic: string,
  options: NewCommandOptions
): Promise<void> {
  const spinner = ora('Initializing AI...').start();

  try {
    // Get AI config from environment
    const config = getConfigFromEnv();
    
    // Create orchestrator
    const orchestrator = createOrchestrator(config);

    // Prepare generation options
    const generateOptions: GenerateOptions = {
      topic,
      slideCount: options.slides ? parseInt(options.slides, 10) : 10,
      theme: options.theme || 'default',
      language: options.language || 'en',
      style: options.style || 'professional',
      includeNotes: options.notes || false,
    };

    spinner.text = `Generating presentation: "${topic}"...`;

    // Generate presentation
    const result = await orchestrator.generatePresentation(generateOptions);

    if (!result.success || !result.data) {
      spinner.fail(chalk.red('Failed to generate presentation'));
      console.error(chalk.red(result.error || 'Unknown error'));
      process.exit(1);
    }

    // Check for layout issues
    const layoutResult = orchestrator.checkDeckLayout(result.data);
    const issues = layoutResult.data || [];

    // Export to markdown
    const markdown = orchestrator.exportToMarkdown(result.data);

    // Determine output path
    const outputPath = options.output || generateFilename(topic);
    const fullPath = resolve(process.cwd(), outputPath);

    // Write file
    spinner.text = 'Writing file...';
    await writeFile(fullPath, markdown, 'utf-8');

    spinner.succeed(chalk.green('Presentation generated successfully!'));

    // Display summary
    console.log('');
    console.log(chalk.cyan('📊 Summary:'));
    console.log(`   ${chalk.white('Topic:')} ${topic}`);
    console.log(`   ${chalk.white('Slides:')} ${result.data.slides.length}`);
    console.log(`   ${chalk.white('Output:')} ${fullPath}`);
    console.log(`   ${chalk.white('Duration:')} ${result.duration}ms`);

    // Display layout issues if any
    if (issues.length > 0) {
      console.log('');
      console.log(chalk.yellow(`⚠️  ${issues.length} layout issue(s) detected:`));
      issues.slice(0, 5).forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        console.log(`   ${icon} Slide ${issue.slideIndex + 1}: ${issue.message}`);
      });
      if (issues.length > 5) {
        console.log(chalk.gray(`   ... and ${issues.length - 5} more`));
      }
      console.log('');
      console.log(chalk.gray('   Run "slidev-ai layout-check <file>" for full details'));
    }

    // Usage hint
    console.log('');
    console.log(chalk.gray('To view your presentation:'));
    console.log(chalk.white(`   npx slidev ${outputPath}`));
    
  } catch (error) {
    spinner.fail(chalk.red('Error generating presentation'));
    
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        console.error(chalk.red('\n❌ OpenAI API key not set'));
        console.error(chalk.gray('Set the OPENAI_API_KEY environment variable:'));
        console.error(chalk.white('   export OPENAI_API_KEY=sk-your-key-here'));
      } else {
        console.error(chalk.red(`\n${error.message}`));
      }
    }
    
    process.exit(1);
  }
}

/**
 * Generate a filename from topic
 */
function generateFilename(topic: string): string {
  const sanitized = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  
  return `${sanitized || 'slides'}.md`;
}

