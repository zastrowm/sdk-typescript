/**
 * Barrel export for all vended tools.
 *
 * Provides a single import path for consumers who want all built-in tools:
 * ```typescript
 * import { bash, fileEditor, httpRequest, notebook } from '@strands-agents/sdk/vended-tools'
 * ```
 *
 * Note: This module requires a Node.js environment because the `bash` tool
 * imports `child_process`. For browser-compatible usage, import individual
 * tools via their subpath exports (e.g., `@strands-agents/sdk/vended-tools/notebook`).
 */

export { bash, BashTimeoutError, BashSessionError } from './bash/index.js'
export type { BashInput, BashOutput, ExecuteInput, RestartInput } from './bash/index.js'

export { fileEditor } from './file-editor/index.js'
export type { FileEditorInput, FileEditorOptions, IFileReader } from './file-editor/index.js'

export { httpRequest } from './http-request/index.js'
export type { HttpRequestInput, HttpRequestOutput } from './http-request/index.js'

export { notebook } from './notebook/index.js'
export type { NotebookState, NotebookInput } from './notebook/index.js'
