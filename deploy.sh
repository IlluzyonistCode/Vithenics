#!/bin/bash

cd /opt/vithenics/server/
pm2 start ./index.js --name "vithenics-server" --env local
pm2 startup
pm2 save
cd ../client/
npm run build
cp -r /opt/vithenics/client/dist/* /var/www/vithenics/