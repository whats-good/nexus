#!/bin/bash

# A script to publish the packages to npm 
# and create the git tags

set -eo pipefail
set -x

pnpm publish -r 
pnpm changeset tag 

echo "Done!"