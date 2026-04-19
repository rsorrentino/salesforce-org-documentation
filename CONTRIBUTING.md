# Contributing Guide

Thank you for your interest in contributing to the Salesforce Documentation Portal.

## Ways to Contribute

- Report bugs and request features using GitHub Issues.
- Improve docs, templates, and examples.
- Fix bugs or implement enhancements.
- Help validate generated output and link quality.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Initialize the project structure (first run only):

   ```bash
   npm run init
   ```

4. Generate docs from your target Salesforce metadata repository:

   ```bash
   npm run generate
   ```

## Branch and PR Workflow

1. Create a topic branch from `main`:

   ```bash
   git checkout -b feat/my-change
   ```

2. Make focused, small commits with clear commit messages.
3. Run checks before opening a pull request:

   ```bash
   npm run generate
   npm run link-check
   ```

4. Open a pull request and complete the PR template.

## Coding Standards

- Keep generator modules small and single-purpose.
- Reuse existing generator and template patterns where possible.
- Prefer descriptive names over abbreviations.
- Avoid unrelated formatting-only changes.

## Testing Expectations

At minimum, contributors should run:

```bash
npm run generate
npm run link-check:warn
```

If your change affects links, run the strict checker too:

```bash
npm run link-check
```

## Documentation Changes

If behavior changes, update:

- `README.md` usage/flags,
- relevant templates in `templates/`,
- and any generated docs workflow notes.

## Commit Message Guidance

Use concise, imperative commit messages, for example:

- `Add security policy and issue templates`
- `Fix flow relationship rendering for empty components`

## Questions

If you are unsure about direction, open an issue first to discuss scope.
