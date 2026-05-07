require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Business = require('../src/models/Business');
const Prediction = require('../src/models/Prediction');
const Alert = require('../src/models/Alert');
const Review = require('../src/models/Review');

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Find Users
    const test1 = await User.findOne({ email: 'test1@smartpulse.com' });
    const test2 = await User.findOne({ email: 'test2@smartpulse.com' });

    if (!test1 || !test2) {
      console.log('❌ Could not find both test1@smartpulse.com and test2@smartpulse.com users. Ensure they are registered first.');
      process.exit(1);
    }

    const users = [
      { user: test1, suffix: '1', businessName: 'Test1 Analytics Corp' },
      { user: test2, suffix: '2', businessName: 'Test2 Global Ltd' },
    ];

    for (const { user, suffix, businessName } of users) {
      console.log(`\n--- Seeding data for ${user.email} ---`);

      // 2. Setup Business
      let business;
      if (user.businessId) {
        business = await Business.findById(user.businessId);
        business.name = businessName;
        await business.save();
      } else {
        business = await Business.create({ name: businessName, industry: 'Technology' });
        user.businessId = business._id;
        await user.save();
      }
      console.log(`✅ Business configured: ${business.name}`);

      // 3. Wipe old data
      await Prediction.deleteMany({ userId: user._id });
      await Alert.deleteMany({ userId: user._id });
      await Review.deleteMany({ userId: user._id });
      console.log(`✅ Wiped old data for ${user.email}`);

      // 4. Generate Predictions
      for (let i = 1; i <= 5; i++) {
        const isAnomaly = i % 3 === 0;
        await Prediction.create({
          userId: user._id,
          businessId: business._id,
          model_name: `Fraud Detector v${suffix}.0`,
          model_type: 'classification',
          prediction: isAnomaly ? 85 + i : 10 + i,
          confidence: isAnomaly ? 0.95 : 0.88,
          anomaly_flag: isAnomaly,
          raw_input: { transaction_id: `TXN-${suffix}00${i}`, amount: isAnomaly ? 4500 : 45 },
          correct: i % 2 === 0 ? true : null,
        });
      }
      console.log(`✅ Generated 5 Predictions`);

      // 5. Generate Alerts
      for (let i = 1; i <= 3; i++) {
        await Alert.create({
          userId: user._id,
          businessId: business._id,
          type: i === 1 ? 'anomaly' : 'system',
          severity: i === 1 ? 'high' : 'medium',
          message: `User ${suffix} Alert: ${i === 1 ? 'High risk transaction detected' : 'Daily report generated'}`,
          read: false,
        });
      }
      console.log(`✅ Generated 3 Alerts`);

      // 6. Generate Reviews (Batch)
      const reviewSentiments = [
        { original_text: `Amazing product for User ${suffix}!`, ai_rating: 5, sentiment: 'Positive', confidence: 0.95, category: 'Product Quality' },
        { original_text: `Terrible experience with service ${suffix}.`, ai_rating: 1, sentiment: 'Negative', confidence: 0.99, category: 'Service' },
        { original_text: `It's okay, nothing special here.`, ai_rating: 3, sentiment: 'Neutral', confidence: 0.88, category: 'General' },
        { original_text: `Loved the packaging from Business ${suffix}.`, ai_rating: 4, sentiment: 'Positive', confidence: 0.92, category: 'Packaging' },
        { original_text: `Broke after one use...`, ai_rating: 2, sentiment: 'Negative', confidence: 0.96, category: 'Product Quality' },
      ];

      await Review.create({
        userId: user._id,
        reviews_sent: reviewSentiments.length,
        predictions: reviewSentiments,
        summary: {
          count: reviewSentiments.length,
          average_stars: 3,
          sentiment_distribution: { positive: 2, neutral: 1, negative: 2 },
          total_latency_ms: 1450,
        }
      });
      console.log(`✅ Generated 1 Review Batch (${reviewSentiments.length} reviews)`);
    }

    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
