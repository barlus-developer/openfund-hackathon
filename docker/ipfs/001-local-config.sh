#!/bin/sh
set -eu

# Reapplied on every start, including when the repository already exists.
origins='["http://127.0.0.1:5173","http://localhost:5173","http://127.0.0.1:5180","http://localhost:5180","http://127.0.0.1:4173","http://localhost:4173","http://127.0.0.1:5001","http://localhost:5001"]'
ipfs config --json API.HTTPHeaders "{\"Access-Control-Allow-Origin\":$origins,\"Access-Control-Allow-Methods\":[\"POST\",\"OPTIONS\"]}"
# Gateway headers are static; a list of origins is invalid browser CORS here.
ipfs config --json Gateway.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json Gateway.HTTPHeaders.Access-Control-Allow-Methods '["GET","HEAD","OPTIONS"]'
ipfs config --json Gateway.NoFetch true
