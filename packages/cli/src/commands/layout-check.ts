/**
 * Layout Check Command
 * Check a slide or deck for layout issues
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import {
  parseSlidev,
  checkSlideLayout,
  checkDeckLayout,
  calculateLayoutScore,
  formatIssuesForDisplay,
  getSeverityColor,
  type LayoutIssue,
  type Slide,
} from '@slidev-ai/core';

export interface LayoutCheckOptions {
  all?: boolean;
  json?: boolean;
}

export async function layoutCheckCommand(
  file: string,
  index?: string,
  options?: LayoutCheckOptions
): Promise<void> {
  const spinner = ora('Reading file...').start();

  try {
    // Read file
    const filePath = resolve(process.cwd(), file);
    const content = await readFile(filePath, 'utf-8');
    const deck = parseSlidev(content);

    spinner.text = 'Analyzing layout...';

    let issues: LayoutIssue[];
    let targetSlide: Slide | undefined;

    // Check specific slide or entire deck
    if (index !== undefined && !options?.all) {
      const slideIndex = parseInt(index, 10);
      
      if (isNaN(slideIndex) || slideIndex < 0 || slideIndex >= deck.slides.length) {
        spinner.fail(chalk.red(`Invalid slide index: ${index}`));
        console.error(chalk.gray(`File has ${deck.slides.length} slides (0-${deck.slides.length - 1})`));
        process.exit(1);
      }

      targetSlide = deck.slides[slideIndex];
      issues = checkSlideLayout(targetSlide);
    } else {
      issues = checkDeckLayout(deck.slides);
    }

    spinner.stop();

    // JSON output
    if (options?.json) {
      console.log(JSON.stringify({
        file,
        slideIndex: targetSlide?.index,
        slideCount: deck.slides.length,
        issues,
        score: calculateLayoutScore(issues),
      }, null, 2));
      return;
    }

    // Display results
    console.log('');
    console.log(chalk.cyan('📐 Layout Analysis Report'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`   ${chalk.white('File:')} ${file}`);
    console.log(`   ${chalk.white('Slides:')} ${deck.slides.length}`);
    
    if (targetSlide !== undefined) {
      console.log(`   ${chalk.white('Checking:')} Slide ${targetSlide.index}`);
    } else {
      console.log(`   ${chalk.white('Checking:')} All slides`);
    }

    // Calculate and display score
    const score = calculateLayoutScore(issues);
    const scoreColor = score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
    console.log(`   ${chalk.white('Score:')} ${scoreColor(`${score}/100`)}`);
    console.log(chalk.gray('─'.repeat(50)));

    // Display issues
    if (issues.length === 0) {
      console.log('');
      console.log(chalk.green('✅ No layout issues detected!'));
      console.log(chalk.gray('   Your slides look great.'));
    } else {
      console.log('');
      console.log(chalk.yellow(`⚠️  Found ${issues.length} issue(s):`));
      
      // Group by slide
      const grouped = groupIssuesBySlide(issues);
      
      for (const [slideIdx, slideIssues] of Object.entries(grouped)) {
        console.log('');
        console.log(chalk.white(`📄 Slide ${Number(slideIdx) + 1}:`));
        
        for (const issue of slideIssues) {
          displayIssue(issue);
        }
      }

      // Summary by severity
      console.log('');
      console.log(chalk.gray('─'.repeat(50)));
      displaySummary(issues);

      // Suggestions
      console.log('');
      console.log(chalk.gray('💡 Tip: Run "slidev-ai enhance <file> <index> <instruction>" to fix issues'));
    }

  } catch (error) {
    spinner.fail(chalk.red('Error checking layout'));
    
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        console.error(chalk.red(`\n❌ File not found: ${file}`));
      } else {
        console.error(chalk.red(`\n${error.message}`));
      }
    }
    
    process.exit(1);
  }
}

/**
 * Group issues by slide index
 */
function groupIssuesBySlide(issues: LayoutIssue[]): Record<number, LayoutIssue[]> {
  return issues.reduce((acc, issue) => {
    if (!acc[issue.slideIndex]) {
      acc[issue.slideIndex] = [];
    }
    acc[issue.slideIndex].push(issue);
    return acc;
  }, {} as Record<number, LayoutIssue[]>);
}

/**
 * Display a single issue with formatting
 */
function displayIssue(issue: LayoutIssue): void {
  const severityIcon = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  }[issue.severity];

  const severityColor = {
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
  }[issue.severity];

  console.log(`   ${severityIcon} ${severityColor(issue.type)}`);
  console.log(`      ${chalk.white(issue.message)}`);
  
  if (issue.meta) {
    const metaStr = Object.entries(issue.meta)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    if (metaStr) {
      console.log(chalk.gray(`      [${metaStr}]`));
    }
  }
  
  if (issue.suggestion) {
    console.log(chalk.gray(`      💡 ${issue.suggestion}`));
  }
}

/**
 * Display summary of issues by severity
 */
function displaySummary(issues: LayoutIssue[]): void {
  const counts = {
    error: issues.filter(i => i.severity === 'error').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  };

  const parts: string[] = [];
  
  if (counts.error > 0) {
    parts.push(chalk.red(`${counts.error} error(s)`));
  }
  if (counts.warning > 0) {
    parts.push(chalk.yellow(`${counts.warning} warning(s)`));
  }
  if (counts.info > 0) {
    parts.push(chalk.blue(`${counts.info} info`));
  }

  console.log(`Summary: ${parts.join(', ')}`);
}

