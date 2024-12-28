import * as sh from 'shelljs';
if (!sh.test('-e', 'debug')) {
    sh.mkdir('debug');
}
sh.cp('-r', 'src/assets', 'debug');
sh.cp('-r', 'src/private-assets', 'debug');