#!/bin/bash
set -eo pipefail

# WARNING: This script should be called from the monorepo root

# get the package.json version of the nexus-nodejs-docker package
VERSION=$(jq -r '.version' ./packages/nexus-nodejs-docker/package.json)
REPO_NAME="whatsgood/nexus"

function main() {
    build
    login
    publish
}

function login() {
    echo "Logging into dockerhub"
    echo $DOCKERHUB_TOKEN | docker login -u whatsgood --password-stdin
}

function build() {
    echo "Building docker image whatsgood/nexus:$VERSION"
    docker build -t $REPO_NAME . -f ./packages/nexus-nodejs-docker/Dockerfile
}

function publish() {
    echo "Pushing docker images"

    tags=("$VERSION" "latest")

    for tag in "${tags[@]}"; do
        echo "Pushing $REPO_NAME:$tag"
        docker tag $REPO_NAME "$REPO_NAME:$tag"
        docker push "$REPO_NAME:$tag"
    done
}

main
