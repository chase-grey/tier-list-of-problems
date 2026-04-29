# AGENTS

This project contains some of the M source code in a large, centralized
development environment.

- Environment ID: 508
- DLG: 

## General Guidance

- Follow the style of the file you are editing.
- Do NOT create new files. Instead, use `epc create`
- Minimize explanatory comments unless they are strictly required.

## MCP Servers

You should have access to several MCP servers as part of this project. Here are
some guidelines on using them.

- For documentation and best practices about server development, prefer the
  `epic-dev:chronicles-docs` skill if available. For ECF (client-server
  communication) documentation, prefer the `epic-dev:ecf-docs` skill. Fall back
  to the `chronicles-docs` MCP server if either skill is not available.
- Use the `epiccode` MCP server to access information about the
  development environment.
- Use `hubble` to look up Epic-specific internal company resources, like DLG or
  design records.

## Building and Testing

Use `epc` to build and test code.

# Include/Exclude

To include or exclude a routine from your workspace, use

```bash
epc include <ROUTINE>
```

```bash
epc exclude <ROUTINE>
```

# Run Linter

Prior to publishing the routine to the database, use `epc check` to run the linter.

```bash
epc check <ROUTINE>
```

```bash
epc check --all
```

# Publish

Publish changes back to the database using `epc publish`

````
epc publish --changed --make-lib
```s

## Version Control

This project does not use git, so do not use it.
````
