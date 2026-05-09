const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function loadServiceAccount() {
  // 1) JSON blob in env (best for deployments)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      // common gotcha: private_key newlines are escaped
      if (parsed && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  }

  // 2) Path in env (useful for local dev)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!fs.existsSync(p)) throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH not found: ${p}`);
    return require(p);
  }

  // 3) Conventional repo-local file (legacy)
  const defaultPath = path.join(__dirname, '..', '..', 'firebase-service-account.json');
  if (fs.existsSync(defaultPath)) {
    return require(defaultPath);
  }

  throw new Error(
    'Firebase service account not configured. Provide FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH, or place firebase-service-account.json in the repo root.'
  );
}

const serviceAccount = loadServiceAccount();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
