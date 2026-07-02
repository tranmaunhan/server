#!/bin/sh
set -eu

: "${VITE_APP_NAME:=}"
: "${VITE_API_BASE_URL:=/api}"
: "${VITE_GOOGLE_CLIENT_ID:=}"

envsubst '${VITE_APP_NAME} ${VITE_API_BASE_URL} ${VITE_GOOGLE_CLIENT_ID}' \
  < /usr/share/nginx/html/runtime-config.template.js \
  > /usr/share/nginx/html/runtime-config.js
