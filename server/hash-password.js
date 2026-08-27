const bcrypt = require('bcryptjs');
bcrypt.hash(process.argv[2], 10).then(console.log);