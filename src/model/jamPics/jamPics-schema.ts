import mongoose from '#src/model/db.js';

const options = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
};

const { Schema } = mongoose;

// JaMmusic slideshow images (#237/web-jam-back#897). Field shape is a direct
// carry-over from the old `Book` model (wj-prod `book` collection, docs with
// `type: 'JaMmusic-music'`) — the #897 migration moved those docs verbatim
// into this NEW `jamPics` collection in web-jam-data. Do not rename/redesign.
const jamPicsSchema = new Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  author: { type: String, required: false },
  numberPages: { type: Number, required: false },
  dateOfPub: { type: Number, required: false },
  url: { type: String, required: false },
  isbn: { type: String, required: false },
  siteLocation: { type: String, required: false },
  numberOfCopies: { type: Number, required: false },
  access: { type: String, required: false },
  comments: { type: String, required: false },
  checkedOutBy: { type: String, required: false },
  checkedOutByName: { type: String, required: false },
}, options);

// Explicit collection name 'jamPics' (name LOCKED, Josh 2026-07-04).
export default mongoose.models.JamPics || mongoose.model('JamPics', jamPicsSchema, 'jamPics');
