import * as sh from 'shelljs';
import packageJSON from '../package.json';
import fs from 'fs';

if (sh.test('-e', 'dist')) {
    sh.mv('dist/src', 'dist/dist');
    sh.cp('-r', 'src/assets', 'dist/dist/');
    sh.cp('-r', 'src/private-assets', 'dist/dist/');

    const pkg = JSON.parse(JSON.stringify(packageJSON));
    pkg.devDependencies = {};
    pkg.scripts = { start: 'node dist/server.js' };
    pkg.buildDate = new Date().toISOString();
    const pkgString = JSON.stringify(pkg, null, 2);
    fs.writeFileSync('dist/package.json', pkgString);
    sh.rm('dist/config.json');
}

