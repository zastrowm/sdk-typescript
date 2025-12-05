# RFC: Pull Request Description Guidelines

## Status

Active

## Summary

This document defines the format and content guidelines for pull request descriptions in the Strands TypeScript SDK repository.

## Motivation

Pull request descriptions serve as the primary documentation for code changes, helping reviewers understand the context and impact of modifications. Well-written descriptions enable faster reviews, better decision-making, and serve as valuable historical documentation.

## Target Audience

PR descriptions should be written for **senior software engineers familiar with both the Python and TypeScript Strands SDK**. Assume the reader:
- Understands the SDK's architecture and patterns
- Has context about the broader system
- Can read code diffs to understand implementation details
- Values concise, focused communication

## Guidelines

### Structure

A PR description MUST include:

1. **Motivation** - Why is this change needed?
2. **Public API Changes** - What changes to the public API (with code examples)?
3. **Use Cases** (optional) - When would developers use this feature?
4. **Breaking Changes** (if applicable) - What breaks and how to migrate?

### Content Principles

**Focus on WHY, not HOW:**
- ✅ "The OpenAI SDK supports dynamic API keys, but we don't expose this capability"
- ❌ "Added ApiKeySetter type import from openai/client"

**Document public API changes with examples:**
- ✅ Show before/after code examples for API changes
- ❌ List every file or line changed

**Be concise:**
- ✅ Use prose over bullet lists when possible
- ❌ Create exhaustive implementation checklists

**Emphasize user impact:**
- ✅ "Enables secret manager integration for credential rotation"
- ❌ "Updated error message to mention 'string or function'"

### What NOT to Include

PR descriptions SHOULD NOT include:

- **Implementation details** - Leave these to code comments and commit messages
- **Test coverage notes** - Assume tests are comprehensive (CI will catch issues)
- **Line-by-line change lists** - The diff provides this information
- **Build/lint/coverage status** - CI handles verification
- **Commit hashes** - GitHub links commits automatically

### Anti-patterns

❌ **Over-detailed checklists:**
```markdown
### Type Definition Updates
- Added ApiKeySetter type import from 'openai/client'
- Updated OpenAIModelOptions interface apiKey type
```

❌ **Implementation notes reviewers don't need:**
```markdown
## Implementation Notes
- No breaking changes - all existing string-based usage continues to work
- OpenAI SDK handles validation of function return values
```

❌ **Test coverage bullets:**
```markdown
### Test Coverage
- Added test: accepts function-based API key
- Added test: accepts async function-based API key
```

### Good Examples

✅ **Motivation section:**
```markdown
## Motivation

The OpenAI SDK supports dynamic API key resolution through async functions,
enabling use cases like credential rotation and secret manager integration.
However, our SDK currently only accepts static strings for the apiKey parameter,
preventing users from leveraging these capabilities.
```

✅ **Public API Changes section:**
```markdown
## Public API Changes

The `OpenAIModelOptions.apiKey` parameter now accepts either a string or an
async function:

\`\`\`typescript
// Before: only string supported
const model = new OpenAIModel({
  modelId: 'gpt-4o',
  apiKey: 'sk-...'
})

// After: function also supported
const model = new OpenAIModel({
  modelId: 'gpt-4o',
  apiKey: async () => await secretManager.getApiKey()
})
\`\`\`

The change is backward compatible—all existing string-based usage continues
to work without modification.
```

✅ **Use Cases section:**
```markdown
## Use Cases

- **API key rotation**: Rotate keys without application restart
- **Secret manager integration**: Fetch credentials from AWS Secrets Manager, Vault, etc.
- **Multi-tenant systems**: Dynamically select API keys based on context
```

## Template

```markdown
## Motivation

[Explain WHY this change is needed. What problem does it solve? What limitation
does it address? What user need does it fulfill?]

Resolves: #[issue-number]

## Public API Changes

[Document changes to public APIs with before/after code examples. If no public
API changes, state "No public API changes."]

\`\`\`typescript
// Before
[existing API usage]

// After
[new API usage]
\`\`\`

[Explain behavior, parameters, return values, and backward compatibility.]

## Use Cases (optional)

[If adding new functionality, provide 2-4 concrete use cases showing when
developers would use this feature.]

## Breaking Changes (if applicable)

[If this is a breaking change, explain what breaks and provide migration guidance.]

### Migration

\`\`\`typescript
// Before
[old code]

// After
[new code]
\`\`\`
```

## Rationale

**Why focus on WHY over HOW?**
- Code diffs show HOW changes are implemented
- Commit messages document detailed changes
- PR descriptions provide the broader context reviewers need

**Why exclude test/lint/coverage details?**
- CI pipelines verify these automatically
- Including them adds noise without value
- Reviewers trust the CI process

**Why assume senior engineer audience?**
- Enables more concise, technical communication
- Reduces redundant explanations
- Respects reviewer expertise

## Enforcement

- PR descriptions SHOULD follow this format
- Reviewers MAY request description updates for PRs that don't follow guidelines
- Agents creating PRs MUST follow these guidelines

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Google's Code Review Guidelines](https://google.github.io/eng-practices/review/)
