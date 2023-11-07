#!/bin/bash

set -eo pipefail
set -x

./scripts/docs.sh --autocommit
pnpm publish -r 
pnpm changeset tag 

# We need to write to /dev/null because this script
# tends to fail when run on CI
set +eo pipefail
set +x

if ! git push --follow-tags 2>/dev/null; then
  echo "git push failed, but the script will continue"
fi

echo "Done!"