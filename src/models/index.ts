// Note: Compulsary use 'require' here, because ts unused 'import' will be removed at build time

require('./user/user');
require('./general/maintenance');

require("./general/version")
require("./general/test")
require('./general/testGroup')
require("./general/report")




require('../models/locations/goodAreas');


require('./notification/notification');


require('./whatsapp/scheduleMessage');
require('./general/history');
require('./fcmNotification/fcmNotification');
