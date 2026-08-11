#!/usr/bin/env bash
# Runs the ADD OS architecture guards, but only when the edited file is one they cover.
# Registered as a PostToolUse hook on Edit|Write|MultiEdit.
#
# Requires: jq on PATH, chmod +x on this file.
# Exit 0 = silent pass. Exit 2 = feed stderr back to Claude as a blocking error.

set -uo pipefail

path="$(jq -r '.tool_input.file_path // empty')"
[ -z "$path" ] && exit 0

case "$path" in
  *src/add-os/theme/*|*design-tokens.json|*figma-tokens.json|*tailwind.css|\
  *src/theme/*|*src/stores/theme.ts|*src/assets/scss/*|\
  *.env*|*.gitignore|*src/add-os/config/*|\
  *src/app-layouts/*|*src/components/common/*) ;;
  *) exit 0 ;;
esac

out="$(pnpm vitest run src/add-os/__tests__ src/add-os/theme/__tests__ --reporter=dot 2>&1)" && exit 0

{
  echo "ADD OS architecture guards FAILED after editing: $path"
  echo "Fix the guard, or revert. Do not weaken an assertion to make it pass —"
  echo "a test that cannot fail for the case it exists to catch manufactures confidence."
  echo
  echo "$out" | tail -40
} >&2
exit 2
