#!/bin/bash

set -eo pipefail


function main() {
    bun_integration
    docker_integration
    cloudflare_integration
    nodejs_integration
    express_integration
    fastify_integration
}

function bun_integration() {
    local source_path="./examples/bun-ts-server/src/index.ts" 
    local destination_path="./docs/integrations/bun.mdx"
    local title="Bun"
    local description="Learn how to use Nexus with Bun"
    generate_docs "$source_path" "$destination_path" "$title" "$description" "$introduction"
}

function docker_integration() {
    local source_path="./docker-compose.yml" 
    local destination_path="./docs/integrations/docker.mdx"
    local title="Docker"
    local introduction="It's possible to run Nexus in a [Docker container](https://hub.docker.com/repository/docker/whatsgood/nexus/general), without needing to write a single line of code. This is possible thanks to the Nexus [environment variables](/key-concepts/environment-variables) that allow you to configure the Nexus instance."
    local description="Learn how to run Nexus as a Docker container"
    generate_docs "$source_path" "$destination_path" "$title" "$description" "$introduction"
}

function cloudflare_integration() {
    local source_path="./examples/cloudflare-worker/src/index.ts" 
    local destination_path="./docs/integrations/cloudflare-worker.mdx"
    local title="Cloudflare"
    local description="Learn how to use Nexus as a Cloudflare Worker"
    generate_docs "$source_path" "$destination_path" "$title" "$description" "$introduction"
}

function nodejs_integration() {
    local source_path="./examples/nodejs-standalone-server/src/index.ts" 
    local destination_path="./docs/integrations/node-js.mdx"
    local title="Node.js"
    local description="Learn how to use Nexus with Node.js"
    generate_docs "$source_path" "$destination_path" "$title" "$description" "$introduction"
}

function express_integration() {
    local source_path="./examples/express-ts-server/src/index.ts" 
    local destination_path="./docs/integrations/express.mdx"
    local title="Express"
    local description="Learn how to use Nexus with Express"
    generate_docs "$source_path" "$destination_path" "$title" "$description" "$introduction"
}

function fastify_integration() {
    local source_path="./examples/fastify-ts-server/src/index.ts" 
    local destination_path="./docs/integrations/fastify.mdx"
    local title="Fastify"
    local description="Learn how to use Nexus with Fastify"
    generate_docs "$source_path" "$destination_path" "$title" "$description" "$introduction"
}

function generate_docs() {
    local source_path=$1
    local destination_path=$2
    local title=$3
    local description=$4
    local introduction=$5

    local source_file_extension="${source_path##*.}"
    local source_filename="${source_path##*/}"

    echo "Generating integration docs for $title"

    # Remove the destination file if it exists:
    if [ -f $destination_path ] ; then
        echo "Removing existing file at $destination_path"
        rm $destination_path
    fi

    echo "---" >> $destination_path
    echo "title: $title" >> $destination_path
    echo "description: $description" >> $destination_path
    echo "---" >> $destination_path
    if [ -n "$introduction" ]; then
        echo "## Introduction" >> $destination_path
        echo $introduction >> $destination_path
    fi
    echo "## Setup" >> $destination_path
    echo "<CodeGroup>" >> $destination_path
    echo "\`\`\`$source_file_extension $source_filename" >> $destination_path
    cat $source_path >> $destination_path
    echo "\`\`\`" >> $destination_path
    echo "</CodeGroup>" >> $destination_path
    echo "## Usage" >> $destination_path
    echo '<Snippet file="send-a-request-no-auth.mdx" />' >> $destination_path
}

main