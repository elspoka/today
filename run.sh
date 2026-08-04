#!/bin/bash
# Run frontend (Vite :5173) + backend (Express :3000) locally

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting server (:3000) and client (:5173)..."
npm run dev
