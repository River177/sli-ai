/**
 * Diagram Command
 * Generate and insert a Mermaid diagram into a slide
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
  getAvailableDiagramTypes,
  type DiagramOptions,
} from '@slidev-ai/core';

export interface DiagramCommandOptions {
  type?: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'pie' | 'mindmap';
  theme?: 'default' | 'forest' | 'dark' | 'neutral';
}

export async function diagramCommand(
  file: string,
  index: string,
  description: string,
  options: DiagramCommandOptions
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

    // Prepare diagram options
    const diagramOptions: DiagramOptions = {
      description,
      type: options.type || 'flowchart',
      theme: options.theme || 'default',
    };

    spinner.text = `Generating ${diagramOptions.type} diagram...`;

    // Generate and add diagram
    const result = await orchestrator.addDiagramToSlide(deck, slideIndex, diagramOptions);

    if (!result.success || !result.data) {
      spinner.fail(chalk.red('Failed to generate diagram'));
      console.error(chalk.red(result.error || 'Unknown error'));
      process.exit(1);
    }

    // Write file
    spinner.text = 'Writing file...';
    const markdown = stringifySlidev(result.data);
    await writeFile(filePath, markdown, 'utf-8');

    spinner.succeed(chalk.green('Diagram added successfully!'));

    // Display summary
    console.log('');
    console.log(chalk.cyan('📊 Diagram Summary:'));
    console.log(`   ${chalk.white('File:')} ${file}`);
    console.log(`   ${chalk.white('Slide:')} ${slideIndex}`);
    console.log(`   ${chalk.white('Type:')} ${diagramOptions.type}`);
    console.log(`   ${chalk.white('Description:')} ${description}`);
    console.log(`   ${chalk.white('Duration:')} ${result.duration}ms`);

    // Show the generated diagram
    const updatedSlide = result.data.slides[slideIndex];
    const mermaidMatch = updatedSlide.content.match(/```mermaid\n([\s\S]*?)```/);
    
    if (mermaidMatch) {
      console.log('');
      console.log(chalk.gray('Generated Mermaid code:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.white(mermaidMatch[1].trim()));
      console.log(chalk.gray('─'.repeat(50)));
    }

  } catch (error) {
    spinner.fail(chalk.red('Error generating diagram'));
    
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

/**
 * List available diagram types
 */
export function listDiagramTypes(): void {
  const types = getAvailableDiagramTypes();
  
  console.log(chalk.cyan('\n📊 Available Diagram Types:\n'));
  
  types.forEach(({ type, name, description }) => {
    console.log(`   ${chalk.white(type.padEnd(12))} ${chalk.gray(name)}`);
    console.log(`   ${' '.repeat(12)} ${chalk.gray(description)}`);
    console.log('');
  });

  console.log(chalk.gray('Usage: slidev-ai diagram <file> <index> <description> --type <type>'));
}

