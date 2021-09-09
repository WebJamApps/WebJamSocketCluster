import Debug from 'debug';
import mongoose from 'mongoose';

const debug = Debug('WebJamSocketServer:lib-controller');

class Controller {
  model: any;

  constructor(model: any) {
    this.model = model;
  }

  async deleteAllDocs(): Promise<boolean> {
    debug('deleteAllDocs');
    try { await this.model.deleteMany({}); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(true);
  }

  async createDocs(body: any):Promise<any> {
    debug('createDocs');
    let result: any;
    try { result = await this.model.create(body); } catch (e) { return Promise.reject(e); }
    debug(result);
    return Promise.resolve(result);
  }

  // async findOne(req, res) {
  //   let book;
  //   try {
  //     book = await this.model.findOne(req.query);
  //   } catch (e) { return res.status(500).json({ message: e.message }); }
  //   if (book === undefined || book === null || book._id === null || book._id === undefined) {
  //     return res.status(400).json({ message: 'invalid request' });
  //   }
  //   return res.status(200).json(book);
  // }
  //
  // async findOneAndUpdate(req, res) {
  //   let updatedBook;
  //   try {
  //     updatedBook = await this.model.findOneAndUpdate(req.query, req.body);
  //   } catch (e) { return res.status(500).json({ message: e.message }); }
  //   if (updatedBook === null || updatedBook === undefined) return res.status(400).json({ message: 'invalid request' });
  //   return res.status(200).json(updatedBook);
  // }
  //
  async getAll(): Promise<any> {
    let collection;
    try {
      collection = await this.model.find({});
    } catch (e) { return Promise.reject(e); }
    return Promise.resolve(collection);
  }

  async getAllSort(sort: any): Promise<any> {
    let collection;
    try {
      collection = await this.model.findSort({}, sort);
    } catch (e) { return Promise.reject(e); }
    return Promise.resolve(collection);
  }

  //
  // findById(req, res) {
  //   if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  //     return res.status(400).send({
  //       message: 'Find id is invalid',
  //     });
  //   }
  //   return this.model.findById(req.params.id)
  //     .then((doc) => {
  //       if (!doc) { return res.status(400).json({ message: 'nothing found with id provided' }); }
  //       if (doc.password !== null && doc.password !== undefined) doc.password = ''; // eslint-disable-line no-param-reassign
  //       return res.status(200).json(doc);
  //     });
  // }
  //
  // async create(req, res) {
  //   debug('create');
  //   debug(req.body);
  //   let single, created, doc;
  //   const docArray = [];
  //   const postBody = req.body;
  //   if (postBody.constructor === Array) {
  //     const arrayLength = postBody.length;
  //     for (let i = 0; i < arrayLength; i += 1) {
  //       try { // eslint-disable-next-line security/detect-object-injection
  //         doc = await this.model.create(postBody[i]); // eslint-disable-line no-await-in-loop
  //       } catch (e) {
  //         debug(e.message);
  //         return res.status(500).json({ message: e.message });
  //       }
  //       docArray.push(doc);
  //     }
  //     created = docArray;
  //   } else {
  //     try {
  //       single = await this.model.create(req.body);
  //     } catch (e) { return res.status(500).json({ message: e.message }); }
  //     created = single;
  //   }
  //   return res.status(201).json(created);
  // }
  //
  findByIdAndUpdate(id: mongoose.Types.ObjectId, body: any): Promise<any> {
    return this.model.findByIdAndUpdate(id, body)
      .then((doc: any) => {
        if (!doc) return Promise.reject(new Error('Id Not Found'));
        return Promise.resolve(doc);
      })
      .catch((e: Error) => Promise.reject(e));
  }

  deleteById(id: mongoose.Types.ObjectId): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(id)) { return Promise.reject(new Error('id is invalid')); }
    return this.model.findByIdAndRemove(id)
      .then((doc: any) => {
        if (!doc) { return Promise.reject(new Error('Delete id not found')); }
        return Promise.resolve(doc);
      })
      .catch((e: Error) => Promise.reject(e));
  }
  // findByIdAndRemove(req, res) {
  //   if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  //     return res.status(400).send({
  //       message: 'id is invalid',
  //     });
  //   }
  //   return this.model.findByIdAndRemove(req.params.id)
  //     .then((doc) => {
  //       if (!doc) {
  //         return res.status(400).send({ message: 'Delete id is invalid' });
  //       }
  //       return res.status(200).json({ message: `${this.model.Schema.modelName} delete was successful` });
  //     });
  // }
  //
  // deleteMany(req, res) {
  //   return this.model.deleteMany(req.query)
  //     .then(() => res.status(200).json({ message: `${this.model.Schema.modelName} delete was successful` }))
  //     .catch((e) => res.status(500).json({ message: e.message }));
  // }
}

export default Controller;
