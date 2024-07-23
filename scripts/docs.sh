#!/bin/bash

# This script is in charge of preparing the changelog for the docs and copying the 
# README into packages/nexus

# Check if the --frozen flag was passed, and the FROZEN flag to true
if [[ $* == *--frozen* ]]
then
    FROZEN="true"
fi

NEXUS_PATH=./packages/nexus
README_PATH=./README.md
HERO_IMAGE_PATH=./docs/images/nexus-hero-banner.svg

# Copy the README into packages/nexus
echo "Copying README into packages/nexus"
cp $README_PATH $NEXUS_PATH

# Copy the hero image into packages/nexus
echo "Copying hero image into packages/nexus"
cp $HERO_IMAGE_PATH "${NEXUS_PATH}/docs/images/"

# Run the changelog generation script
echo "Running changelog generation script"
sh ./scripts/generate-docs-changelog-mdx.sh

# Run the integrations docs generation script
echo "Running integrations docs generation script"
sh ./scripts/generate-docs-integrations.sh

# If the --frozen flag was passed, run a git diff to see if the changelog or the readme has changed 
if [ "$FROZEN" = "true" ] ; then

    # If the STRICT flag is passed, check if the changelog or the readme has changed too
    if [ "$STRICT" = "true" ] ; then
        echo "Checking if the changelog has changed"
        if [[ $(git diff --name-only) == *"docs/development/changelog.mdx"* ]] ; then
            echo "Error: The changelog has changed. Please run 'pnpm docs:generate' and commit the changes"
            exit 1
        fi

        echo "Checking if the readme has changed"
        if [[ $(git diff --name-only) == *"packages/nexus/README.md"* ]] ; then
            echo "Error: The README has changed. Please run 'pnpm docs:generate' and commit the changes"
            exit 1
        fi
    fi

    echo "Checking if the integrations have changed"
    if [[ $(git diff --name-only) == *"docs/integrations/"* ]] ; then
        echo "Error: The examples have changed. Please run 'pnpm docs:generate' and commit the changes"
        exit 1
    fi
fi

echo "Done!"