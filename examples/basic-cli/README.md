# Basic CLI Example

This example demonstrates how to use the Slidev-AI CLI to generate and edit presentations.

## Prerequisites

1. Set your OpenAI API key:

```bash
export OPENAI_API_KEY=sk-your-key-here
```

2. Build the project from the root:

```bash
cd ../..
pnpm install
pnpm build
```

## Usage

### Generate a New Presentation

```bash
# Using npm script
npm run demo:new

# Or directly
pnpm slidev-ai new "Introduction to TypeScript" --slides 5 --output demo.md
```

### Enhance a Slide

```bash
# Using npm script
npm run demo:enhance

# Or directly
pnpm slidev-ai enhance demo.md 1 "Add more code examples"
```

### Add a Diagram

```bash
# Using npm script
npm run demo:diagram

# Or directly
pnpm slidev-ai diagram demo.md 2 "Show TypeScript compilation flow" --type flowchart
```

### Check Layout Issues

```bash
# Using npm script
npm run demo:check

# Or directly
pnpm slidev-ai layout-check demo.md --all
```

### View Presentation

```bash
npm run slidev
# or
npx slidev demo.md
```

## Full Demo

Run all steps and open Slidev:

```bash
npm run all
```

## CLI Commands Reference

### `slidev-ai new <topic>`

Generate a new presentation.

Options:
- `-s, --slides <count>` - Number of slides (default: 10)
- `-t, --theme <theme>` - Slidev theme (default: default)
- `-l, --language <lang>` - Content language (default: en)
- `--style <style>` - Style: professional, casual, academic, creative
- `-o, --output <file>` - Output file path
- `-n, --notes` - Include speaker notes

### `slidev-ai enhance <file> <index> <instruction>`

Edit a specific slide with AI.

Options:
- `--no-auto-fix` - Disable automatic layout fixing
- `--max-iterations <count>` - Maximum fix iterations (default: 3)

### `slidev-ai diagram <file> <index> <description>`

Add a Mermaid diagram to a slide.

Options:
- `-t, --type <type>` - Diagram type (flowchart, sequence, class, etc.)
- `--theme <theme>` - Mermaid theme

### `slidev-ai layout-check <file> [index]`

Check slides for layout issues.

Options:
- `-a, --all` - Check all slides
- `--json` - Output as JSON

## Example Output

After running `npm run demo:new`, you'll get a file like:

```markdown
---
theme: default
title: Introduction to TypeScript
---

# Introduction to TypeScript

A modern approach to JavaScript development

---

## What is TypeScript?

- Superset of JavaScript
- Adds static typing
- Compiles to JavaScript
- Better IDE support

---

## Key Features

- Type annotations
- Interfaces
- Generics
- Enums

...
```

