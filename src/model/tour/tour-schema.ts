import mongoose from '../db';

const options = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
};

const { Schema } = mongoose;

const tourSchema = new Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
  datetime: { type: Date, require: true },
  location: { type: String, required: true },
  venue: { type: String, required: true },
  tickets: { type: String, required: false },
  more: { type: String, required: false },
}, options);

export default mongoose.model('Tour', tourSchema);
