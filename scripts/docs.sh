#!/bin/bash

# This script is in charge of preparing the changelog for the docs and copying the 
# README into packages/nexus

# Check if the --frozen flag was passed, and the FROZEN flag to true
if [[ $* == *--frozen* ]]
then
    FROZEN=true
else
    FROZEN=false
fi

# Check if the --autocommit flag was passed, and the AUTOCOMMIT flag to true
if [[ $* == *--autocommit* ]]
then
    AUTOCOMMIT=true
else
    AUTOCOMMIT=false
fi

NEXUS_PATH=./packages/nexus
README_PATH=./README.md

# Copy the README into packages/nexus
echo "Copying README into packages/nexus"
cp $README_PATH $NEXUS_PATH


# Run the changelog generation script
echo "Running changelog generation script"
sh ./scripts/generate-docs-changelog-mdx.sh

# If the --frozen flag was passed, run a git diff to see if the changelog or the readme has changed 
if [ "$FROZEN" = true ] ; then
    echo "Checking if the changelog has changed"
    if [[ $(git diff --name-only) == *"docs/changelog.mdx"* ]] ; then
        echo "Error: The changelog has changed. Please run 'pnpm generate:docs' and commit the changes"
        exit 1
    fi

    echo "Checking if the readme has changed"
    if [[ $(git diff --name-only) == *"packages/nexus/README.md"* ]] ; then
        echo "Error: The README has changed. Please run 'pnpm generate:docs' and commit the changes"
        exit 1
    fi
fi

# If the --autocommit flag was passed, commit the changes
if [ "$AUTOCOMMIT" = true ] ; then
  # First, check if there are any changes to commit
    if [[ $(git diff --name-only) == *"docs/changelog.mdx"* ]] || [[ $(git diff --name-only) == *"packages/nexus/README.md"* ]] ; then
        echo "Committing changes"
        git add docs/changelog.mdx
        git add packages/nexus/README.md
        git commit -m "docs: update changelog and readme"
    else
        echo "No changes to commit"
    fi
fi

echo "Done!"