// const debug = require('debug')('WebJamSocketServer:book-controller');
const Controller = require('../../lib/controller');
const bookModel = require('./book-facade');

class BookController extends Controller {
  // findCheckedOut(req, res) {
  //   return this.model.find({ checkedOutBy: req.params.id })
  //     .then((collection) => res.status(200).json(collection));
  // }

  // async deleteAllBooks() {
  //   try { await this.model.deleteMany({}); } catch (e) { debug(e.message); throw e; }
  //   return Promise.resolve(true);
  // }

  // async makeOneBook(body) {
  //   let result;
  //   try { result = await this.model.create(body); } catch (e) {
  //     debug(e.message); throw e;
  //   } debug(result);
  //   return Promise.resolve(true);
  // }
}

module.exports = new BookController(bookModel);
