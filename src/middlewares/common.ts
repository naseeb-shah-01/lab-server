import { checkAppName } from './app-name';
import { checkRegisteredApp } from './registered-app';
import { checkMaintenance } from './maintenance';
import { checkVersion } from './version';
import { checkRenewUser } from './renew-user';
import { checkQuery } from './query';
import { checkUserAuth } from './auth';

const middlewares = [
	checkAppName,
	checkRegisteredApp,
	checkMaintenance,
	checkVersion,
	checkRenewUser,
	checkQuery
];
export const withAuth = () => {
	return [...middlewares, checkUserAuth];
};
export const withoutAuth = () => {
	return [...middlewares];
};
