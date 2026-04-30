const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  businessId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  model_name:   { type: String, required: true },
  model_type:   { type: String, required: true },
  prediction:   { type: Number, required: true },
  confidence:   { type: Number, required: true },
  anomaly_flag: { type: Boolean, default: false },
  cluster_label:{ type: Number, default: null },
  pca_x:        { type: Number, default: null },
  pca_y:        { type: Number, default: null },
  input_hash:   { type: String },
  correct:      { type: Boolean, default: null },
  feedback_at:  { type: Date, default: null },
  timestamp:    { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Prediction', predictionSchema);
