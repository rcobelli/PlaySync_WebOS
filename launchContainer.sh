#!/bin/sh
docker run -it --rm --name node-dev  -v "${PWD}:/app" ` -w /app ` -p 3000:3000 ` node:24-bookworm bash