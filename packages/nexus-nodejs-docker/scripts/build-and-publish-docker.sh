#!/bin/bash

# WARNING: This script should be called from the monorepo root

# get the package.json version of the nexus package
VERSION=$(jq -r '.version' ./packages/nexus/package.json)
REPO_NAME="whatsgood/nexus"

echo "Building docker image whatsgood/nexus:$VERSION"

docker build -t $REPO_NAME . -f ./packages/nexus-nodejs-docker/Dockerfile

tags=("$VERSION" "latest")

for tag in "${tags[@]}"; do
    echo "Pushing $REPO_NAME:$tag"
    docker tag $REPO_NAME "$REPO_NAME:$tag"
    docker push "$REPO_NAME:$tag"
done