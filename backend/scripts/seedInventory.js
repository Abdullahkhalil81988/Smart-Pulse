require('dotenv').config();
const path = require('path');
const admin = require('../src/firebase-config');
const connectDB = require('../src/db');
const User = require('../src/models/User');
const Inventory = require('../src/models/Inventory');

const USERS = [
  { email: 'test1@smartpulse.com', password: 'password123', name: 'Test User One' },
  { email: 'test2@smartpulse.com', password: 'password123', name: 'Test User Two' }
];

const SEED_DATA = {
  'test1@smartpulse.com': [
    { code: "T1-COF-001", name: "Espresso", category: "Coffee", price: 3.50, stock: 45, lowThreshold: 20, unit: "servings" },
    { code: "T1-COF-002", name: "Latte", category: "Coffee", price: 4.80, stock: 12, lowThreshold: 30, unit: "servings" },
    { code: "T1-FOD-001", name: "Blueberry Muffin", category: "Food", price: 3.20, stock: 18, lowThreshold: 10, unit: "pcs" },
  ],
  'test2@smartpulse.com': [
    { code: "T2-DRK-001", name: "Iced Tea", category: "Drinks", price: 3.00, stock: 60, lowThreshold: 15, unit: "bottles" },
    { code: "T2-SNK-001", name: "Granola Bar", category: "Snacks", price: 2.50, stock: 40, lowThreshold: 15, unit: "pcs" },
    { code: "T2-SNK-002", name: "Chips", category: "Snacks", price: 1.80, stock: 5, lowThreshold: 20, unit: "bags" },
  ]
};

async function getOrCreateFirebaseUser(email, password, displayName) {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`Firebase user found for ${email}`);
    return userRecord;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`Creating Firebase user for ${email}...`);
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
      });
      return userRecord;
    }
    throw error;
  }
}

async function seed() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    for (const u of USERS) {
      // 1. Ensure Firebase User
      const fbUser = await getOrCreateFirebaseUser(u.email, u.password, u.name);

      // 2. Ensure MongoDB User
      let mongoUser = await User.findOne({ firebaseUid: fbUser.uid });
      if (!mongoUser) {
        mongoUser = await User.create({
          firebaseUid: fbUser.uid,
          email: u.email,
          name: u.name,
        });
        console.log(`Created MongoDB user for ${u.email}`);
      } else {
        console.log(`MongoDB user already exists for ${u.email}`);
      }

      // 3. Clear existing inventory for this user
      await Inventory.deleteMany({ userId: mongoUser._id });
      console.log(`Cleared existing inventory for ${u.email}`);

      // 4. Insert seeded inventory
      const itemsToInsert = SEED_DATA[u.email].map(item => ({
        ...item,
        userId: mongoUser._id
      }));

      await Inventory.insertMany(itemsToInsert);
      console.log(`Seeded ${itemsToInsert.length} inventory items for ${u.email}`);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
