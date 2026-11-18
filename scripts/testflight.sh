#!/usr/bin/env bash
# Builds the iOS app on EAS and sends it to TestFlight, non-interactively.
# Needs EXPO_TOKEN, APPLE_TEAM_ID and an App Store Connect key (ASC_* or
# APPLE_API_*) in the environment; scripts/asc-key.mjs picks the one that works.
set -euo pipefail
cd "$(dirname "$0")/.."
export NODE_USE_ENV_PROXY=1 NODE_NO_WARNINGS=1
eval "$(node scripts/asc-key.mjs)"
export EXPO_APPLE_TEAM_ID="${APPLE_TEAM_ID:?APPLE_TEAM_ID is not set}"
npx -y eas-cli@latest build --platform ios --profile production \
  --auto-submit --non-interactive --no-wait "$@" </dev/null
