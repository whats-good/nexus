#!/bin/bash

# A script to publish the packages to npm 
# and create the git tags

set -eo pipefail
set -x

pnpm publish --access public -r
# pnpm changeset tag 

# Publish the docker image
exec packages/nexus-nodejs-docker/scripts/build-and-publish-docker.sh

echo "Done!"