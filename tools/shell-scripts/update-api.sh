rm -rf ./update-api
unzip  ./update-api.zip -d update-api
rm -rf ./api/old-dist ./api/old-package.json ./api/package-lock.json ./api/new-dist ./api/new-package.json
mv ./api/dist ./api/old-dist
mv ./api/package.json ./api/old-package.json
cp -r ./update-api/dist/* ./api/
rm -rf ./update-api
cd api && npm i
