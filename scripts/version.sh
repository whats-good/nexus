#!/bin/bash

# A script to bump the version of the packages, 
# generate changelogs and update the docs

set -eo pipefail
set -x

pnpm changeset version
./scripts/docs.sh 

echo "Done!"