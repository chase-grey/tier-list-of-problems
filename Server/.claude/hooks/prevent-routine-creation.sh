#!/usr/bin/env bash

# Prevents routines from being created without using epc create

PROTECTED_DIR="$CLAUDE_PROJECT_DIR/508"

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"//')

if [[ "$FILE_PATH" == "$PROTECTED_DIR"* ]] && [[ ! -f "$FILE_PATH" ]]; then
echo "Blocked: cannot create new files in $PROTECTED_DIR. Use epc create instead." >&2
exit 2
fi

exit 0
