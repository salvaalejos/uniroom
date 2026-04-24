#!/bin/bash

docker-compose up -d

cd mobile/uniroom
npm install 
cd ../..
cd backend/
cd app/
bun install 
npm install 
npx prisma migrate dev --name init
npx prisma generate
bun run src/index.ts










