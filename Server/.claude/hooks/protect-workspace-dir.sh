#!/usr/bin/env bash

# Prevents reading from or writing to the .workspace directory

PROTECTED_DIR="$CLAUDE_PROJECT_DIR/.workspace"

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | sed 's/"tool_name":"//;s/"//')

case "$TOOL_NAME" in
  Read|Edit|Write|NotebookEdit)
    FILE_PATH=$(echo "$INPUT" | grep -oE '"(file_path|notebook_path)":"[^"]*"' | head -1 | sed 's/.*":"//;s/"//')
    if [[ "$FILE_PATH" == "$PROTECTED_DIR"* ]] || [[ "$FILE_PATH" == *"/.workspace/"* ]] || [[ "$FILE_PATH" == *"/.workspace" ]]; then
      echo "Blocked: the .workspace directory is off-limits." >&2
      exit 2
    fi
    ;;
  Glob|Grep)
    PATH_VAL=$(echo "$INPUT" | grep -o '"path":"[^"]*"' | head -1 | sed 's/"path":"//;s/"//')
    PATTERN=$(echo "$INPUT" | grep -o '"pattern":"[^"]*"' | head -1 | sed 's/"pattern":"//;s/"//')
    if [[ "$PATH_VAL" == "$PROTECTED_DIR"* ]] || [[ "$PATH_VAL" == *"/.workspace/"* ]] || [[ "$PATH_VAL" == *"/.workspace" ]]; then
      echo "Blocked: the .workspace directory is off-limits." >&2
      exit 2
    fi
    if [[ "$PATTERN" == ".workspace"* ]] || [[ "$PATTERN" == ".workspace/"* ]]; then
      echo "Blocked: the .workspace directory is off-limits." >&2
      exit 2
    fi
    ;;
  Bash)
    COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"//')
    if echo "$COMMAND" | grep -qE '(^|[^a-zA-Z0-9])\.workspace([/ "'"'"']|$)'; then
      echo "Blocked: the .workspace directory is off-limits." >&2
      exit 2
    fi
    ;;
esac

exit 0
