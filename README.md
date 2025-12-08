# Slidev-AI

🚀 AI-powered Slidev presentation generator and editor.

## Features

- 🤖 **AI-powered slide generation** - Generate complete Slidev presentations from topics
- ✏️ **Smart slide editing** - Edit individual slides with natural language instructions
- 📊 **Auto diagram generation** - Generate Mermaid diagrams automatically
- 🖼️ **Image generation** - Generate and insert illustrations
- 📐 **Layout detection** - Detect and fix layout issues automatically
- 🔧 **CLI tools** - Easy-to-use command line interface
- 🌐 **Web UI** - Beautiful web interface for visual editing

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Generate a new presentation
pnpm --filter @slidev-ai/cli slidev-ai new "Introduction to TypeScript"

# Enhance a slide
pnpm --filter @slidev-ai/cli slidev-ai enhance slides.md 2 "Add more examples"

# Start Web UI
cd packages/web-ui && pnpm start
# Then open http://localhost:5173
```

## Project Structure

```
slidev-ai/
├── packages/
│   ├── core/           # Core library (parsing, AI, generation)
│   ├── cli/            # CLI tool
│   ├── web-ui/         # Web UI (Vue 3 + Vite)
│   ├── slidev-plugin/  # Slidev plugin with API & sidebar
│   └── layout-checker/ # Layout detection utilities
├── examples/
│   └── basic-cli/      # Basic CLI usage examples
└── docs/
    └── tech-design.md  # Technical documentation
```

## Requirements

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- OpenAI API Key (set via `OPENAI_API_KEY` environment variable)

## Environment Variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Packages

### @slidev-ai/core

Core library providing:
- Slidev file parsing and stringification
- AI text generation (Vercel AI SDK)
- Mermaid diagram generation
- Image generation
- Layout heuristic detection
- Orchestrator for tool calling

### @slidev-ai/cli

Command line interface:
- `slidev-ai new <topic>` - Generate new presentation
- `slidev-ai enhance <file> <index> <instruction>` - Enhance a slide
- `slidev-ai diagram <file> <index> <description>` - Add diagram
- `slidev-ai layout-check <file> <index>` - Check layout issues

### @slidev-ai/web-ui

Web interface providing:
- Visual presentation editor
- Real-time preview
- AI generation controls
- Layout issue visualization
- Slide management

### @slidev-ai/slidev-plugin

Slidev plugin providing:
- REST API endpoints for AI features
- Vue sidebar component (skeleton)

### @slidev-ai/layout-checker

Layout detection utilities:
- Heuristic-based detection
- Playwright stub for headless browser detection

## License

MIT

