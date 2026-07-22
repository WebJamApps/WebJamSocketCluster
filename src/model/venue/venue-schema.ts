import mongoose from '../db.js';

const { Schema } = mongoose;

const venueSchema = new Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, required: false, trim: true },
  usState: { type: String, required: false, trim: true },
  website: { type: String, required: false, trim: true },
});

export default mongoose.models.Venue || mongoose.model('Venue', venueSchema, 'venues');
