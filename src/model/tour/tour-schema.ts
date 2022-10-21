import mongoose from '../db';

const options = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
};

const { Schema } = mongoose;

const tourSchema = new Schema({
  date: { type: String, required: false },
  time: { type: String, required: false },
  datetime: { type: Date, require: true },
  location: { type: String, required: false },
  city: { type: String, required: false },
  usState: { type: String, required: false },
  venue: { type: String, required: true },
  tickets: { type: String, required: false },
  more: { type: String, required: false },
}, options);

export default mongoose.model('Tour', tourSchema);
