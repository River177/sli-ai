#!/usr/bin/env node
/**
 * Slidev-AI CLI
 * Command-line tool for AI-powered Slidev presentation generation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { config as loadEnv } from 'dotenv';
import { newCommand } from './commands/new.js';
import { enhanceCommand } from './commands/enhance.js';
import { diagramCommand, listDiagramTypes } from './commands/diagram.js';
import { layoutCheckCommand } from './commands/layout-check.js';

// Load environment variables
loadEnv();

// ASCII Art Logo
const logo = `
${chalk.cyan('╔═══════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.white('🎯 Slidev-AI')}                          ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('AI-Powered Presentation Generator')}     ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════╝')}
`;

// Create CLI program
const program = new Command();

program
  .name('slidev-ai')
  .description('AI-powered Slidev presentation generator and editor')
  .version('0.1.0')
  .addHelpText('beforeAll', logo);

// New command - generate new presentation
program
  .command('new <topic>')
  .description('Generate a new Slidev presentation from a topic')
  .option('-s, --slides <count>', 'Number of slides to generate', '10')
  .option('-t, --theme <theme>', 'Slidev theme to use', 'default')
  .option('-l, --language <lang>', 'Content language', 'en')
  .option('--style <style>', 'Presentation style (professional, casual, academic, creative)', 'professional')
  .option('-o, --output <file>', 'Output file path')
  .option('-n, --notes', 'Include speaker notes')
  .action(async (topic, options) => {
    await newCommand(topic, options);
  });

// Enhance command - edit a slide
program
  .command('enhance <file> <index> <instruction>')
  .description('Enhance a specific slide with AI')
  .option('--no-auto-fix', 'Disable automatic layout fixing')
  .option('--max-iterations <count>', 'Maximum fix iterations', '3')
  .action(async (file, index, instruction, options) => {
    await enhanceCommand(file, index, instruction, options);
  });

// Diagram command - add diagram to slide
program
  .command('diagram <file> <index> <description>')
  .description('Generate and insert a Mermaid diagram')
  .option('-t, --type <type>', 'Diagram type (flowchart, sequence, class, state, er, gantt, pie, mindmap)', 'flowchart')
  .option('--theme <theme>', 'Mermaid theme (default, forest, dark, neutral)', 'default')
  .action(async (file, index, description, options) => {
    await diagramCommand(file, index, description, options);
  });

// Diagram types list
program
  .command('diagram-types')
  .description('List available diagram types')
  .action(() => {
    listDiagramTypes();
  });

// Layout check command
program
  .command('layout-check <file> [index]')
  .description('Check slide(s) for layout issues')
  .option('-a, --all', 'Check all slides (ignore index)')
  .option('--json', 'Output results as JSON')
  .action(async (file, index, options) => {
    await layoutCheckCommand(file, index, options);
  });

// Image command (placeholder for future)
program
  .command('image <file> <index> <prompt>')
  .description('Generate and insert an image (requires DALL-E)')
  .option('-p, --position <pos>', 'Insert position (start, end, after-title)', 'end')
  .action(async (_file, _index, _prompt, _options) => {
    console.log(chalk.yellow('⚠️  Image generation is coming soon!'));
    console.log(chalk.gray('   This feature requires OpenAI DALL-E API access.'));
  });

// Fix command - auto-fix layout issues
program
  .command('fix <file> [index]')
  .description('Automatically fix layout issues')
  .option('-a, --all', 'Fix all slides')
  .action(async (file, index, options) => {
    if (options.all || index === undefined) {
      console.log(chalk.yellow('⚠️  Auto-fix for entire deck is coming soon!'));
      console.log(chalk.gray('   For now, use: slidev-ai enhance <file> <index> "fix layout issues"'));
    } else {
      // Use enhance command with fix instruction
      await enhanceCommand(file, index, 'Fix all layout issues while preserving the content meaning', {
        autoFix: true,
        maxIterations: '5',
      });
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(logo);
  program.outputHelp();
}

