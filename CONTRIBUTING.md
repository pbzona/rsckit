# Contributing to rsckit

Thank you for your interest in contributing to `rsckit`! This document provides an overview of the project structure, architecture, and workflows to help you get started.

## Architecture Overview

`rsckit` is a CLI tool designed to analyze Next.js projects, focusing on React Server Components (RSC), dependency graphs, and bundle sizes. The architecture centers around building a graph of the user's application and applying transformations to generate reports.

### High-Level Flow

1.  **CLI Entry Point** (`src/cli.ts`): Uses `commander` to define commands (`analyze`, `report`).
2.  **Command Handler** (`src/commands/*`): Orchestrates the execution.
    *   **Analyze**: Crawls the file system, parses files, builds the graph, and saves the state to a cache.
    *   **Report**: Reads from the cache, applies transformations (like size calculation), and outputs the result.
3.  **Project** (`src/project/project.ts`): The main controller class. It manages the `SourceFileRepository`, `ParserService`, and `Cache`.
4.  **SourceFile** (`src/source-file/source-file.ts`): Represents a single file in the target project. It handles reading, parsing, and analyzing dependencies for that specific file.
5.  **Parser** (`src/parser/service.ts`): Wraps `@swc/core` (for fast AST generation) and `jscodeshift` (for AST traversal and manipulation).
6.  **Transforms** (`src/project/transforms.ts`): A pipeline system for modifying the final analysis output (e.g., adding size metrics).

### Key Concepts

*   **SourceFile**: The atomic unit of analysis. Each file is parsed to extract imports (dependencies) and directives (e.g., `"use client"`).
*   **Cache**: Analysis is expensive. We cache the state of every `SourceFile` to disk (`.rsckit/source-files.json`). The `analyze` command populates this, and `report` reads it.
*   **Client Boundary**: A specific edge in the graph where a Server Component imports a Client Component. This is a key metric for RSC analysis.

## Project Structure

```text
src/
├── bin/            # Binary entry points
├── cache/          # Caching logic (fs persistence)
├── commands/       # CLI command definitions (analyze, report)
├── lib/            # Shared utilities (hashing, formatting, output)
├── parser/         # SWC and jscodeshift wrappers
├── project/        # Core business logic (Project class, Transforms)
├── source-file/    # SourceFile entity and Repository
├── components/     # UI components (if applicable)
└── index.ts        # Library exports
```

## Development Workflow

### Prerequisites

*   Node.js (v18+)
*   pnpm

### Setup

```bash
git clone https://github.com/your-username/rsckit.git
cd rsckit
pnpm install
```

### Common Commands

*   **Build**: `pnpm build` (Uses `tsup` to bundle the CLI)
*   **Test**: `pnpm test` (Uses `jest`)
*   **Lint**: `pnpm lint` (Uses `biome`)
*   **Format**: `pnpm format` (Uses `biome`)
*   **Run CLI locally**:
    *   You can run the built CLI using `node dist/cli.js`
    *   Or use the npm script alias: `pnpm rsckit:analyze` (check `package.json` for the exact script)

## Adding Features

### Adding a New Command

1.  Create a new file in `src/commands/` (e.g., `my-command.ts`).
2.  Export a registration function: `export const registerMyCommand = (program: Command) => { ... }`.
3.  Register it in `src/cli.ts`.

### Adding a New Metric (Transform)

To add new data to the JSON report (e.g., calculating complexity, counting hook usage):

1.  **Define Types**: Update `src/project/analysis-types.ts` to include the new fields in `AnalyzedPage` or `AnalyzedClientBoundary`.
2.  **Create Transform**: Add a new function in `src/project/transforms.ts` that implements the `AnalysisTransform` type.
    ```typescript
    export const addMyMetric: AnalysisTransform = async (output, project) => {
      // ... modify output
      return output;
    };
    ```
3.  **Register**: Add your transform to the pipeline in `src/commands/report.ts` (and `analyze.ts` if applicable).

### Modifying Parsing Logic

If you need to extract new information from files (e.g., finding specific function calls):

1.  Update `src/parser/operations.ts`. Use `jscodeshift` (available via `parser.collection`) to query the AST.
2.  Update `SourceFile` to store this new data.

## Testing

We use Jest for testing.
*   **Unit Tests**: Co-located with the file they test (e.g., `foo.ts` -> `foo.test.ts`).
*   **Mocks**: We use manual mocks or Jest mocks for file system and heavy project dependencies.

Please ensure `pnpm test` passes before submitting a PR.

## Style Guide

*   Use `biom` for formatting and linting.
*   Prefer `async/await` over promises.
*   Use strict TypeScript types (avoid `any`).
*   File names should be `kebab-case`.
