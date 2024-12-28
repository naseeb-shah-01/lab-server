rm -rf ./update-web
unzip ./update-web.zip -d update-web
rm -rf ./old-web
mv ./web ./old-web
cp -r ./update-web/aekatra-ecommerce-web ./web
rm -rf ./update-web
