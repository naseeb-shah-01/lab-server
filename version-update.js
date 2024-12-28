let fs = require('fs');
let semver = require('semver');
if (fs.existsSync('./package.json')) {
	let pkg = require('./package.json');
	let oldVersion = pkg.version;
	let type = process.argv[2];
	let preid = 'alpha';
	if (
		!['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'].includes(
			type
		)
	) {
		type = 'patch';
	}
	if (type === 'prerelease') {
		preid =
			process.argv[3] ||
			(semver.prerelease(oldVersion) && semver.prerelease(oldVersion).length === 2
				? semver.prerelease(oldVersion)[0]
				: 'alpha');
	} else {
		preid = process.argv[3] || 'alpha';
	}
	let newVersion = semver.inc(pkg.version, type, preid);
	pkg.version = newVersion;
	fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 4));

	if (fs.existsSync('./server')) {
		if (fs.existsSync('./server/package.json')) {
			let serverPkg = require('./server/package.json');
			let serverOldVersion = serverPkg.version;
			serverPkg.version = newVersion;
			fs.writeFileSync('./server/package.json', JSON.stringify(serverPkg, null, 4));
		}
	}
}
