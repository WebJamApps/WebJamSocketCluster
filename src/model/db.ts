import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
mongoose.Promise = global.Promise;// use es6 default promise library in mongoose
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
const mongoOptions:any = {
  keepAlive: 1, useNewUrlParser: true, autoIndex: true, useUnifiedTopology: true,
};
/* istanbul ignore if */
if (process.env.NODE_ENV === 'production') mongoOptions.autoIndex = false;
let uri = process.env.MONGO_DB_URI || '';
/* istanbul ignore else */
if (process.env.NODE_ENV === 'test') uri = process.env.TEST_MONGO || '';
mongoose.connect(uri, mongoOptions);
/* istanbul ignore next */
mongoose.connection.on('error', (e) => {
  if (process.env.NODE_ENV !== 'test') throw new Error(`unable to connect to database: ${uri}`);
  else console.log(e.message);// eslint-disable-line no-console
});

export default mongoose;
