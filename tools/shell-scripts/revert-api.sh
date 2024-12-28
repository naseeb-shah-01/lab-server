mv ./api/dist ./api/new-dist
mv ./api/old-dist ./api/dist
mv ./api/package.json ./api/new-package.json
mv ./api/old-package.json ./api/package.json
rm -rf ./api/package-lock.json
cd api && npm i
