const admin = require('firebase-admin');
const path = require('path');

// Load the service-account JSON from the backend root
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
