#!/bin/bash

# A script to publish the packages to npm 
# and create the git tags

set -eo pipefail

function main() {
    # we need to check for changeset status before running pnpm publish.
    local should_publish_docker=$(check_docker_publish)

    pnpm publish --access public -r
    publish_docker_image $should_publish_docker

    echo "Done!"
}

function publish_docker_image() {
    local should_publish_docker=$1
    if [[ $should_publish_docker == "true" ]]; then
        echo "nexus-nodejs-docker package has been updated. Publishing docker image."
        exec packages/nexus-nodejs-docker/scripts/publish-docker.sh
    else
        echo "nexus-nodejs-docker package has not been updated. Skipping docker image publish."
    fi
}

# return true only if the changeset contains the nexus-nodejs-docker package
function check_docker_publish() {
    local changeset_status=$(pnpm changeset status)

    if [[ $changeset_status == *"nexus-nodejs-docker"* ]]; then
        echo "true"
    else
        echo "false"
    fi
}

main