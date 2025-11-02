#!/usr/bin/env bash
set -e

echo "==> Atualizando código"
git pull origin main

echo "==> Instalando deps"
npm ci

echo "==> Build"
npm run build

echo "==> (Re)start PM2"
npm run pm2:start || npm run pm2:restart

echo "==> Logs recentes"
pm2 logs codex-realtime --lines 50

