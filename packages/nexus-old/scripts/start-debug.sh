#!/bin/bash

# Load direnv
eval "$(direnv export bash)"

# Run your ts-node script
ts-node -r tsconfig-paths/register ./src/example/index.ts
