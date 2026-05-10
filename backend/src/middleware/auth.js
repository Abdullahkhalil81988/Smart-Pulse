const admin = require('../firebase-config');
const User = require('../models/User');

/**
 * Firebase Auth middleware.
 * Extracts the Bearer token from the Authorization header,
 * verifies it with Firebase Admin SDK, and attaches the
 * matching MongoDB user document to req.user.
 *
 * If the user doesn't exist in MongoDB yet (first request after
 * Firebase sign-up), a new User document is created automatically.
 */
async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    console.warn(`[auth] missing bearer token for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify the Firebase ID token
    const idToken = header.slice(7);
    const decoded = await admin.auth().verifyIdToken(idToken);

    // Find or create the MongoDB user from the Firebase uid
    let user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      // First-time sync: create a local user record
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email || '',
        name: decoded.name || decoded.email || 'User',
      });
    }

    let teamIds = [user._id];
    if (user.businessId) {
      const peers = await User.find({ businessId: user.businessId }).select('_id');
      teamIds = peers.map(p => p._id);
    }

    // Attach user info for downstream route handlers
    req.user = {
      id: user._id,
      firebaseUid: decoded.uid,
      email: user.email,
      name: user.name,
      businessId: user.businessId,
      teamIds: teamIds,
    };

    next();
  } catch (err) {
    console.error(`[auth] firebase verification failed for ${req.method} ${req.originalUrl}: ${err.message}`);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = auth;
