# Slidev-AI Technical Design Document

## 1. Overview

Slidev-AI is a comprehensive toolkit for AI-powered Slidev presentation generation and editing. It provides:

- **CLI Tool**: Command-line interface for generating and editing presentations
- **Core Library**: TypeScript library for parsing, AI generation, and layout detection
- **Slidev Plugin**: Integration with Slidev dev server for real-time editing
- **Layout Checker**: Utilities for detecting and fixing layout issues

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
├─────────────────┬───────────────────────┬───────────────────┤
│    CLI Tool     │    Slidev Plugin      │    Direct API     │
│  (@slidev-ai/   │   (@slidev-ai/        │                   │
│     cli)        │   slidev-plugin)      │                   │
├─────────────────┴───────────────────────┴───────────────────┤
│                     Orchestrator Layer                       │
│              (Tool calling, State management)                │
├─────────────────────────────────────────────────────────────┤
│                        Core Library                          │
│                     (@slidev-ai/core)                        │
├────────────┬────────────┬────────────┬──────────────────────┤
│   Parser   │    LLM     │  Diagram   │   Layout Heuristic   │
│ (gray-     │ (Vercel    │ (Mermaid)  │   (Text analysis)    │
│  matter)   │  AI SDK)   │            │                      │
├────────────┴────────────┴────────────┴──────────────────────┤
│                     External Services                        │
├───────────────────────────┬─────────────────────────────────┤
│     OpenAI API            │     Playwright (optional)       │
│  (GPT-4, DALL-E)          │   (Browser-based checking)      │
└───────────────────────────┴─────────────────────────────────┘
```

## 3. Module Specifications

### 3.1 Core Library (`@slidev-ai/core`)

#### 3.1.1 Parser Module (`slidevParser.ts`)

Handles Slidev markdown parsing and serialization.

**Functions:**
- `parseSlidev(content: string): SlideDeck` - Parse markdown into structured data
- `stringifySlidev(deck: SlideDeck): string` - Convert back to markdown
- `updateSlide(deck, index, content): SlideDeck` - Update a specific slide
- `insertSlide(deck, index, slide): SlideDeck` - Insert a new slide
- `removeSlide(deck, index): SlideDeck` - Remove a slide

**Data Structures:**
```typescript
interface SlideDeck {
  frontmatter: SlidevFrontmatter;
  slides: Slide[];
  raw: string;
}

interface Slide {
  index: number;
  content: string;
  frontmatter?: Record<string, unknown>;
  layout?: string;
  notes?: string;
}
```

#### 3.1.2 LLM Module (`llm.ts`)

Handles AI text generation using Vercel AI SDK.

**Functions:**
- `generatePresentation(options, config): Promise<string>` - Generate full presentation
- `editSlide(content, options, config, issues): Promise<string>` - Edit single slide
- `fixLayoutIssues(content, issues, config): Promise<string>` - Auto-fix issues
- `splitSlide(content, issues, config): Promise<string[]>` - Split overcrowded slide

**Configuration:**
```typescript
interface AIConfig {
  apiKey: string;
  model?: string;        // Default: gpt-4-turbo-preview
  imageModel?: string;   // Default: dall-e-3
  temperature?: number;  // Default: 0.7
  maxTokens?: number;    // Default: 4096
}
```

#### 3.1.3 Diagram Module (`diagram.ts`)

Generates Mermaid diagrams using AI.

**Functions:**
- `generateDiagram(options, config): Promise<DiagramResult>` - Generate diagram
- `formatMermaidMarkdown(code): string` - Format as markdown block
- `insertDiagramIntoSlide(content, diagram, position): string` - Insert into slide

**Supported Diagram Types:**
- Flowchart
- Sequence Diagram
- Class Diagram
- State Diagram
- ER Diagram
- Gantt Chart
- Pie Chart
- Mind Map

#### 3.1.4 Image Module (`image.ts`)

Generates images using OpenAI DALL-E.

**Functions:**
- `generateImage(options, config): Promise<ImageResult>` - Generate image
- `generateAndSaveImage(options, config, path): Promise<ImageResult>` - Generate and save
- `insertImageIntoSlide(content, image, position): string` - Insert into slide

#### 3.1.5 Layout Heuristic Module (`layoutHeuristic.ts`)

Detects layout issues using rule-based analysis.

**Functions:**
- `checkSlideLayout(slide, config): LayoutIssue[]` - Check single slide
- `checkDeckLayout(slides, config): LayoutIssue[]` - Check all slides
- `calculateLayoutScore(issues): number` - Calculate quality score (0-100)

### 3.2 Layout Issues Definition

```typescript
type LayoutIssueType =
  | 'too-long-text'        // Text exceeds recommended length
  | 'too-many-bullets'     // Too many bullet points
  | 'image-text-crowded'   // Image and text competing for space
  | 'overflow-detected'    // Content overflows boundaries
  | 'font-too-small'       // Font size too small (browser check)
  | 'empty-slide'          // Slide has no meaningful content
  | 'missing-title';       // Slide lacks a title/heading

interface LayoutIssue {
  type: LayoutIssueType;
  message: string;
  severity: 'error' | 'warning' | 'info';
  slideIndex: number;
  suggestion?: string;
  meta?: {
    charCount?: number;
    bulletCount?: number;
    imageCount?: number;
    overflowPixels?: number;
  };
}
```

**Default Thresholds:**
- Max characters per slide: 600
- Max bullet points per slide: 6
- Max code lines per block: 20

### 3.3 Orchestrator (`orchestrator.ts`)

Coordinates all tool calls and manages state.

**Class: `SlidevAIOrchestrator`**

```typescript
class SlidevAIOrchestrator {
  // Generate new presentation
  generatePresentation(options: GenerateOptions): Promise<ToolCallResult<SlideDeck>>
  
  // Edit with auto-fix loop
  editSlideWithFeedback(deck, index, options): Promise<EditSlideResult>
  
  // Add diagram
  addDiagramToSlide(deck, index, options): Promise<ToolCallResult<SlideDeck>>
  
  // Add image
  addImageToSlide(deck, index, options): Promise<ToolCallResult<SlideDeck>>
  
  // Check layout
  checkSlideLayout(slide): ToolCallResult<LayoutIssue[]>
  checkDeckLayout(deck): ToolCallResult<LayoutIssue[]>
  
  // Fix layout
  fixSlideLayout(deck, index): Promise<ToolCallResult<SlideDeck>>
  splitCrowdedSlide(deck, index): Promise<ToolCallResult<SlideDeck>>
}
```

**Edit with Feedback Flow:**
```
User Instruction → AI Edit → Layout Check → Issues? 
                                             ├─No→ Done
                                             └─Yes→ AI Fix → Layout Check → Repeat
```

### 3.4 CLI Tool (`@slidev-ai/cli`)

**Commands:**

| Command | Description |
|---------|-------------|
| `slidev-ai new <topic>` | Generate new presentation |
| `slidev-ai enhance <file> <index> <instruction>` | Edit a slide |
| `slidev-ai diagram <file> <index> <description>` | Add diagram |
| `slidev-ai layout-check <file> [index]` | Check layout |
| `slidev-ai fix <file> [index]` | Auto-fix issues |

### 3.5 Slidev Plugin (`@slidev-ai/slidev-plugin`)

**Server API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/slidev-ai/edit-slide` | POST | Edit a slide |
| `/api/slidev-ai/generate-diagram` | POST | Generate diagram |
| `/api/slidev-ai/generate-image` | POST | Generate image |
| `/api/slidev-ai/check-layout` | POST | Check layout |
| `/api/slidev-ai/health` | GET | Health check |

**Vue Components:**
- `AISidebar` - Sidebar component for Slidev

## 4. Prompt Architecture

### 4.1 System Prompt Structure

```
[Role Definition]
You are an expert presentation designer...

[Capabilities]
- Generate clear content
- Control text density
- Use Slidev syntax

[Slidev Rules]
- Slide separator: ---
- Frontmatter syntax
- Layout specifications

[Layout Guidelines]
- Character limits
- Bullet limits
- Code block limits

[Output Format]
- Pure markdown
- No explanations
```

### 4.2 Prompt Templates

1. **Generate Prompt** - Full presentation from topic
2. **Edit Prompt** - Modify single slide
3. **Layout Fix Prompt** - Fix specific issues
4. **Split Prompt** - Divide overcrowded slide
5. **Diagram Prompt** - Generate Mermaid code

### 4.3 Issue-Aware Editing

When layout issues are detected, they're included in the edit prompt:

```
### Layout Issues to Fix:
- too-long-text: Slide has 750 characters (Suggestion: Reduce text)
- too-many-bullets: 8 bullet points (Suggestion: Consolidate)

IMPORTANT: Fix these issues while following the user instruction.
```

## 5. Tool Calling Flow

```
┌──────────────┐
│ User Request │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Parse Request    │
│ (Determine tool) │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐     ┌──────────────────┐
│ Execute Tool     │────▶│ Record History   │
└──────┬───────────┘     └──────────────────┘
       │
       ▼
┌──────────────────┐
│ Check Layout     │
└──────┬───────────┘
       │
       ▼
   ┌───┴───┐
   │Issues?│
   └───┬───┘
       │
  Yes  │  No
   ▼   │   ▼
┌──────┴───┐  ┌──────────────┐
│ Auto-Fix │  │ Return       │
│ Loop     │  │ Result       │
└──────┬───┘  └──────────────┘
       │
       ▼
┌──────────────────┐
│ Max Iterations?  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Return Result    │
│ with remaining   │
│ issues           │
└──────────────────┘
```

## 6. Project Roadmap

### Phase 1: Core (Current)
- [x] Slidev parser
- [x] AI text generation
- [x] Mermaid diagram generation
- [x] Heuristic layout detection
- [x] CLI tool
- [x] Basic Slidev plugin

### Phase 2: Enhancement
- [ ] Image generation with DALL-E
- [ ] Playwright-based layout detection
- [ ] Theme-aware generation
- [ ] Multi-language support
- [ ] Custom prompt templates

### Phase 3: Advanced
- [ ] Draw.io diagram support
- [ ] Real-time collaboration
- [ ] Version history
- [ ] Export to PDF/PPTX
- [ ] Custom AI models

### Phase 4: Enterprise
- [ ] Team workspaces
- [ ] Access control
- [ ] Audit logging
- [ ] SSO integration
- [ ] On-premise deployment

## 7. Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `OPENAI_MODEL` | Text model | gpt-4-turbo-preview |
| `OPENAI_IMAGE_MODEL` | Image model | dall-e-3 |
| `OPENAI_BASE_URL` | API base URL | OpenAI default |

### Layout Check Config

```typescript
interface LayoutCheckConfig {
  maxCharsPerSlide: number;      // Default: 600
  maxBulletsPerSlide: number;    // Default: 6
  useHeadlessBrowser: boolean;   // Default: false
  viewportWidth: number;         // Default: 1920
  viewportHeight: number;        // Default: 1080
}
```

## 8. Error Handling

### Error Types

1. **Configuration Errors**
   - Missing API key
   - Invalid model name

2. **API Errors**
   - Rate limiting
   - Token limits exceeded
   - Network failures

3. **Parse Errors**
   - Invalid markdown
   - Malformed frontmatter

4. **Layout Errors**
   - Cannot fix within iterations
   - Browser not available

### Error Recovery

- Automatic retry with exponential backoff
- Graceful degradation (skip optional features)
- Detailed error messages with suggestions

## 9. Testing Strategy

### Unit Tests
- Parser functions
- Layout heuristics
- Prompt generation

### Integration Tests
- Full generation flow
- Edit with feedback loop
- Plugin API endpoints

### E2E Tests
- CLI commands
- Slidev integration
- Browser-based checks

## 10. Security Considerations

1. **API Key Management**
   - Never log API keys
   - Support environment variables
   - Optional key encryption

2. **Input Validation**
   - Sanitize user instructions
   - Limit input sizes
   - Validate file paths

3. **Output Safety**
   - Validate generated markdown
   - Escape special characters
   - Prevent code injection

