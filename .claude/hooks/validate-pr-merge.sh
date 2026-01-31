#!/bin/bash
# Pre-merge validation hook
# Enforces git workflow: features (3+ files) must merge to dev, not main.
# Promotions from dev to main are allowed.

set -e

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check commands where gh pr merge is an actual command (not inside a string)
# Split by command separators and check if any segment starts with gh pr merge
if ! echo "$COMMAND" | tr ';' '\n' | sed 's/&&/\n/g' | sed 's/||/\n/g' | grep -qE '^\s*gh\s+pr\s+merge'; then
  exit 0
fi

# Extract PR number from command
PR_NUMBER=$(echo "$COMMAND" | grep -oE '[0-9]+' | head -1)

if [ -z "$PR_NUMBER" ]; then
  exit 0
fi

# Get PR metadata
PR_DATA=$(gh pr view "$PR_NUMBER" --json baseRefName,headRefName,changedFiles 2>/dev/null)

if [ -z "$PR_DATA" ]; then
  exit 0
fi

BASE=$(echo "$PR_DATA" | jq -r '.baseRefName')
HEAD=$(echo "$PR_DATA" | jq -r '.headRefName')
FILES=$(echo "$PR_DATA" | jq -r '.changedFiles')

# Allow dev -> main promotions
if [ "$HEAD" = "dev" ] && [ "$BASE" = "main" ]; then
  exit 0
fi

# Block feature-sized PRs (3+ files) targeting main directly
if [ "$BASE" = "main" ] && [ "$FILES" -ge 3 ] 2>/dev/null; then
  echo "BLOCKED: PR #$PR_NUMBER has $FILES changed files and targets main directly." >&2
  echo "Per workflow rules, features (3+ files) must go through dev first." >&2
  echo "Either retarget this PR to dev, or merge to dev and promote separately." >&2
  exit 2
fi

exit 0
