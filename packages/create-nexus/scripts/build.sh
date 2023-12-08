tsup

# get dist/index.js and prepend it with #!/usr/bin/env node

FILE=dist/index.js
echo "#!/usr/bin/env node" | cat - $FILE > temp && mv temp $FILE