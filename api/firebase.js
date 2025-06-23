const admin = require('firebase-admin');

let serviceAccount;
if (process.env.NODE_ENV === 'production') {
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
} else {
    serviceAccount = require('./serviceAccountKey.json');
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

module.exports = { admin, db };
