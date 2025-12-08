/**
 * Diagram Generation Module
 * Generate Mermaid diagrams using AI
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { AIConfig, DiagramOptions, DiagramResult } from './types.js';
import { getDiagramPrompt } from './prompts/systemPrompt.js';

/**
 * Mermaid diagram type definitions with examples
 */
const MERMAID_EXAMPLES: Record<string, string> = {
  flowchart: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,

  sequence: `sequenceDiagram
    participant A as Client
    participant B as Server
    A->>B: Request
    B-->>A: Response`,

  class: `classDiagram
    class Animal {
        +String name
        +makeSound()
    }
    class Dog {
        +bark()
    }
    Animal <|-- Dog`,

  state: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: start
    Processing --> Complete: finish
    Complete --> [*]`,

  er: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    PRODUCT ||--o{ LINE-ITEM : includes`,

  gantt: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1: 2024-01-01, 30d
    Task 2: 2024-01-15, 20d`,

  pie: `pie title Distribution
    "Category A": 40
    "Category B": 30
    "Category C": 30`,

  mindmap: `mindmap
    root((Main Topic))
        Branch 1
            Leaf 1
            Leaf 2
        Branch 2
            Leaf 3`,
};

/**
 * Generate a Mermaid diagram using AI
 */
export async function generateDiagram(
  options: DiagramOptions,
  config: AIConfig
): Promise<DiagramResult> {
  try {
    const model = openai(config.model || 'gpt-4-turbo-preview');
    const prompt = getDiagramPrompt(options);

    const { text } = await generateText({
      model,
      prompt,
    });

    const mermaidCode = cleanMermaidCode(text);
    
    // Validate the generated code
    const validation = validateMermaidSyntax(mermaidCode, options.type);
    if (!validation.valid) {
      return {
        success: false,
        mermaidCode: '',
        markdown: '',
        error: validation.error,
      };
    }

    const markdown = formatMermaidMarkdown(mermaidCode);

    return {
      success: true,
      mermaidCode,
      markdown,
    };
  } catch (error) {
    return {
      success: false,
      mermaidCode: '',
      markdown: '',
      error: error instanceof Error ? error.message : 'Unknown error generating diagram',
    };
  }
}

/**
 * Generate a diagram from a template type
 */
export function generateDiagramFromTemplate(
  type: DiagramOptions['type'],
  customization?: Record<string, string>
): DiagramResult {
  const template = MERMAID_EXAMPLES[type || 'flowchart'];
  
  if (!template) {
    return {
      success: false,
      mermaidCode: '',
      markdown: '',
      error: `Unknown diagram type: ${type}`,
    };
  }

  let mermaidCode = template;

  // Apply customizations
  if (customization) {
    for (const [placeholder, value] of Object.entries(customization)) {
      mermaidCode = mermaidCode.replace(new RegExp(placeholder, 'g'), value);
    }
  }

  return {
    success: true,
    mermaidCode,
    markdown: formatMermaidMarkdown(mermaidCode),
  };
}

/**
 * Clean Mermaid code from AI output
 */
function cleanMermaidCode(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code fences
  if (cleaned.startsWith('```mermaid')) {
    cleaned = cleaned.replace(/^```mermaid\n?/, '').replace(/\n?```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
  }

  // Remove any explanation text
  const lines = cleaned.split('\n');
  const diagramStartKeywords = [
    'flowchart', 'graph', 'sequenceDiagram', 'classDiagram',
    'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap',
    'journey', 'gitGraph', 'C4Context', 'timeline'
  ];

  const startIndex = lines.findIndex(line => 
    diagramStartKeywords.some(keyword => line.trim().startsWith(keyword))
  );

  if (startIndex > 0) {
    cleaned = lines.slice(startIndex).join('\n');
  }

  return cleaned.trim();
}

/**
 * Validate Mermaid syntax (basic validation)
 */
function validateMermaidSyntax(
  code: string,
  expectedType?: DiagramOptions['type']
): { valid: boolean; error?: string } {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'Empty Mermaid code' };
  }

  const firstLine = code.trim().split('\n')[0].toLowerCase();

  // Check for valid diagram type declaration
  const validStarts = [
    'flowchart', 'graph', 'sequencediagram', 'classdiagram',
    'statediagram', 'erdiagram', 'gantt', 'pie', 'mindmap',
    'journey', 'gitgraph', 'c4context', 'timeline'
  ];

  const hasValidStart = validStarts.some(start => 
    firstLine.startsWith(start) || firstLine.includes(start)
  );

  if (!hasValidStart) {
    return { 
      valid: false, 
      error: 'Invalid Mermaid syntax: missing diagram type declaration' 
    };
  }

  // If expected type provided, verify it matches
  if (expectedType) {
    const typeMap: Record<string, string[]> = {
      flowchart: ['flowchart', 'graph'],
      sequence: ['sequencediagram'],
      class: ['classdiagram'],
      state: ['statediagram'],
      er: ['erdiagram'],
      gantt: ['gantt'],
      pie: ['pie'],
      mindmap: ['mindmap'],
    };

    const expectedStarts = typeMap[expectedType] || [];
    const matchesExpected = expectedStarts.some(start => 
      firstLine.includes(start)
    );

    if (!matchesExpected && expectedStarts.length > 0) {
      return {
        valid: false,
        error: `Expected ${expectedType} diagram but got different type`,
      };
    }
  }

  return { valid: true };
}

/**
 * Format Mermaid code as a markdown code block
 */
export function formatMermaidMarkdown(mermaidCode: string): string {
  return `\`\`\`mermaid
${mermaidCode.trim()}
\`\`\``;
}

/**
 * Insert a diagram into slide content
 */
export function insertDiagramIntoSlide(
  slideContent: string,
  diagram: DiagramResult,
  position: 'start' | 'end' | 'replace' = 'end'
): string {
  if (!diagram.success || !diagram.markdown) {
    return slideContent;
  }

  switch (position) {
    case 'start':
      return `${diagram.markdown}\n\n${slideContent}`;
    case 'end':
      return `${slideContent}\n\n${diagram.markdown}`;
    case 'replace':
      // Replace existing mermaid blocks
      return slideContent.replace(
        /```mermaid[\s\S]*?```/g,
        diagram.markdown
      );
    default:
      return `${slideContent}\n\n${diagram.markdown}`;
  }
}

/**
 * Extract and update diagrams in slide content
 */
export function updateDiagramsInSlide(
  slideContent: string,
  updateFn: (code: string, index: number) => string
): string {
  let index = 0;
  return slideContent.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (_match, code) => {
      const updatedCode = updateFn(code.trim(), index);
      index++;
      return formatMermaidMarkdown(updatedCode);
    }
  );
}

/**
 * Get available diagram types
 */
export function getAvailableDiagramTypes(): Array<{
  type: string;
  name: string;
  description: string;
}> {
  return [
    { type: 'flowchart', name: 'Flowchart', description: 'Process flows and decision trees' },
    { type: 'sequence', name: 'Sequence Diagram', description: 'Interaction sequences between participants' },
    { type: 'class', name: 'Class Diagram', description: 'Object-oriented class structures' },
    { type: 'state', name: 'State Diagram', description: 'State machines and transitions' },
    { type: 'er', name: 'ER Diagram', description: 'Entity-relationship diagrams for databases' },
    { type: 'gantt', name: 'Gantt Chart', description: 'Project timelines and schedules' },
    { type: 'pie', name: 'Pie Chart', description: 'Proportional data visualization' },
    { type: 'mindmap', name: 'Mind Map', description: 'Hierarchical idea organization' },
  ];
}

