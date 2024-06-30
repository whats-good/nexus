#!/bin/bash

# A script to publish the packages to npm 
# and create the git tags

set -eo pipefail

pnpm publish --access public -r
echo "Done!"
