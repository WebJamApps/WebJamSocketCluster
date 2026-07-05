import mongoose from '../db.js';

const options = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
};

const { Schema } = mongoose;

const gigSchema = new Schema({
  date: { type: String, required: false },
  time: { type: String, required: false },
  datetime: { type: Date, require: true },
  location: { type: String, required: false },
  city: { type: String, required: false },
  usState: { type: String, required: false },
  venue: { type: String, required: true },
  tickets: { type: String, required: false },
  duration: { type: Number, required: false, default: 0 },
  promoImageUrl: { type: String, required: false },
  more: { type: String, required: false },
  // Artist/tenant slug (#237/web-jam-back#887, e.g. "josh" | "tim"). Absent on
  // all pre-#237 records, which read as the default (josh) artist. Kept in
  // sync with web-jam-back's mirror of this schema.
  artist: { type: String, required: false },
}, options);

// Explicit collection name 'gigs' (a tours -> gigs migration moves the data).
export default mongoose.models.Gig || mongoose.model('Gig', gigSchema, 'gigs');
