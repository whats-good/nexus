#!/bin/bash

# All scripts are assumed to be run from the root of the repo

SOURCE_FILE=./packages/nexus/CHANGELOG.md
DESTINATION_FILE=./docs/changelog.mdx

# Read the contents of file.txt into a variable, preserving newlines
content=$(while IFS= read -r line; do echo "$line"; done < $SOURCE_FILE)

# If destination file exists, delete it
if [ -f $DESTINATION_FILE ] ; then
    rm $DESTINATION_FILE
fi

# Add the following content to the beginning of the file
echo "---" >> $DESTINATION_FILE
echo "title: Changelog" >> $DESTINATION_FILE
echo "description: Take a look what we have been shipping" >> $DESTINATION_FILE
echo "---" >> $DESTINATION_FILE
echo "" >> $DESTINATION_FILE

# Delete the first 2 lines of the content
content=$(echo "$content" | sed '1,2d')

# Remove the ### headers
content=$(echo "$content" | sed 's/###//g')

# Make the ## headers into ### headers
content=$(echo "$content" | sed 's/##/###/g')

# Save the modified content to a different file
echo "$content" >> $DESTINATION_FILE