Always read before starting the pan and implementation:

C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\claude-dev-loop.md
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\instructions.md
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\skills
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\prompts

Context

You are working on an existing project called “Salesforce Documentation Portal”, a Node.js-based static site generator that analyzes Salesforce metadata and produces a full technical documentation website.

A first version of the application already exists, including:

Metadata analyzers

Modular generators

HTML templates

Client-side UI (search, navigation)

Mermaid integration (currently broken)

You are not building from scratch.
You must analyze, fix, extend, and improve the existing implementation.

Current README (Reference)

Use the following README as the baseline understanding of the system (DO NOT rewrite blindly — improve it later):

[PASTE README HERE — already provided above]

Objectives

You must:

Fix existing issues

Improve architecture where needed

Add missing capabilities

Ensure the app works end-to-end

Update documentation (README)

Fix repository hygiene (.gitignore)

Critical Issues to Fix
1. Mermaid Diagrams Not Rendering

Mermaid graphs are not generated or not displayed correctly

Ensure:

Correct Mermaid syntax generation

Proper client-side initialization

Rendering after DOM load

Support for multiple diagrams per page

Add fallback/error handling when diagrams fail

2. Functional Maps Not Generated

The system is supposed to generate:

UI → Flow → Apex → Object mappings

Profile-based functional visibility

Fix or implement:

FunctionalMapGenerator

Cross-layer dependency tracing

Clear visualization (Mermaid or structured HTML)

3. Profile Access Maps Missing or Incomplete

For each Profile, ensure generation of:

Accessible FlexiPages

Accessible LWCs / Aura

Accessible Apex Classes

Accessible Flows

Also include:

Source of access (Profile vs Permission Set)

Clear tabular + visual mapping

4. Layout Issues

Fix UI/UX problems such as:

Broken layouts

Misaligned tables

Overflow issues

Poor readability

Ensure:

Responsive design

Clean spacing

Consistent typography

Proper use of CSS variables (dark mode compatible)

5. Navigation Issues

Fix and improve:

Broken links

Missing cross-references

Poor navigation hierarchy

Enhance:

Sidebar navigation (collapsible tree)

Breadcrumbs

Active page highlighting

Deep linking between related entities

New Feature Requirement: Dynamic Source Folder
Requirement

The app must allow specifying a custom folder path containing Salesforce metadata.

Implementation

Add support for:

npm run generate -- --source=../my-salesforce-repo

OR

SOURCE_DIR=../repo npm run generate

Update:

generate.js

analyzers.js

Any file system logic

Behavior

Default to current directory if not provided

Validate path

Provide clear error messages

Log which directory is being analyzed

Architecture Improvements (Important)

Where needed, refactor to ensure:

Clear separation between:

Analysis phase

Data model

Rendering phase

Introduce (if missing):

Central dependency graph model

Reusable mapping utilities

Ensure generators:

Do not duplicate logic

Consume shared structured data

Output Quality Improvements

Ensure the generated documentation:

Has strong cross-linking

Avoids orphan pages

Includes:

Empty-state handling (e.g. “No flows found”)

Error visibility (missing metadata)

Produces consistent HTML structure across pages

README Improvements

You must rewrite and improve the README to include:

1. Clear Project Description

What the tool does

Who it is for (Salesforce teams, architects, support)

2. New Feature Documentation

How to pass a custom source folder

Examples

3. Troubleshooting Section

Include:

Mermaid not rendering

Missing metadata

Broken links

Performance issues

4. Architecture Explanation (Simplified)

How analyzers and generators work together

5. Output Explanation

What gets generated and where

.gitignore Fixes

Update .gitignore to properly exclude:

Generated Artifacts

/pages/

/data/

/dist/ (if present)

*.log

Node

node_modules/

OS / Editor

.DS_Store

.idea/

.vscode/

Ensure:

Source code is tracked

Generated output is NOT (unless explicitly required)

Expected Output From You

You must provide:

1. Code Changes

Updated files (only what changed, but complete snippets)

New utilities if needed

2. Fix Implementations

Mermaid rendering fix

Functional maps generation

Profile access mapping

3. CLI Enhancement

Source folder parameter support

4. UI Improvements

Navigation fixes

Layout fixes

5. Updated README

Full rewritten version

6. Updated .gitignore
Working Style

Be precise and pragmatic

Do not over-engineer

Prefer incremental improvements over full rewrites

Keep compatibility with current structure unless necessary

Final Instruction

Act as a Senior Salesforce Technical Architect + Senior Node.js Engineer responsible for making this tool:

Production-ready

Maintainable

Reliable for large Salesforce orgs (1000+ classes, 100+ profiles)

Deliver concrete, working improvements, not just suggestions.