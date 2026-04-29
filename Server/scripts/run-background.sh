#!/usr/bin/env bash

set -e 

# This script creates a duplicate workspace of the current, and tasks a terminal
# agent to perform some task. Specify an environment to run the task in, and a
# prompt to pass along to the CLI tool.

# Usage: ./scripts/run-background.sh --env 30557 --prompt "Clean up this tag"

get_current_workspace() {
    if [[ ! -f "workspace.json" ]]; then
        echo "Error: workspace.json not found in current directory. Run this script from the root of a workspace." >&2
        exit 1
    fi
    basename "$PWD"
}

get_new_location() {
    local current_workspace
    current_workspace=$(get_current_workspace)
    local timestamp
    timestamp=$(date +"%Y%m%d%H%M%S")
    echo "../${current_workspace}-Worktree-${timestamp}"
}

print_help() {
    echo "Usage: sh $0 --env <environment_id> --agent codex --prompt <task_prompt>"
    echo
    echo "Options:"
    echo "  --env       The environment ID to run the task in."
    echo "  --agent     The agent to use for the task (currently 'codex' and 'claude' are supported)."
    echo "  --prompt    The prompt to pass to the CLI tool for the task."
    echo
}

main() {

    local env
    local prompt
    local agent

    while [[ "$1" == --* ]]; do
        case "$1" in
            --env)
                env="$2"
                shift 2
                ;;
            --prompt)
                prompt="$2"
                shift 2
                ;;
            --agent)
                agent="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1" >&2
                exit 1
                ;;
        esac
    done

    if [[ -z "$env" || -z "$prompt" || -z "$agent" ]]; then
        print_help
        exit 1
    fi

    local current_workspace
    current_workspace=$(get_current_workspace)
    local new_location
    new_location=$(get_new_location)

    echo "Creating new workspace at '$new_location' by copying from '$current_workspace'..."

    epc -v init --env "$env" --copy-from "$current_workspace" --no-clipboard "$new_location"

    case "$agent" in
        codex)
            codex exec --skip-git-repo-check --full-auto --cd "$new_location" "$prompt"
            exit 1
            ;;
        claude)
            cd "$new_location"
            claude --print text --allowedTools "Bash,Read,Edit" "$prompt"
            cd -
            exit 1
            ;;
        *)
            echo "Error: Unsupported agent '$agent'. Currently, only 'codex' and 'claude' is supported." >&2
            exit 1
            ;;
    esac
}

main "$@"
