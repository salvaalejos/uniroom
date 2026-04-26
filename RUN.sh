#!/bin/bash

powershell -c "irm bun.sh/install.ps1 | iex"
docker-compose up -d

cd mobile/uniroom
npm install 
npm audit fix
cd ../..
cd backend/
cd app/
bun install 
npm install 
npm audit fix
npx prisma migrate dev --name init
npx prisma generate
bun run src/index.ts










