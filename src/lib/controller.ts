import Debug from 'debug';
import type mongoose from 'mongoose';
import type Facade from './facade.js';
import type { SortOrder, QueryFilter } from '../types/index.js';

const debug = Debug('WebJamSocketServer:controller');

class Controller<T = Record<string, unknown>> {
  model: Facade<T>;

  constructor(model: Facade<T>) {
    this.model = model;
  }

  async deleteAllDocs(): Promise<boolean> {
    debug('deleteAllDocs');
    try { await this.model.deleteMany({}); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(true);
  }

  async createDocs(body: Partial<T> | Partial<T>[]): Promise<T | T[]> {
    debug('createDocs');
    let result: T | T[];
    try { result = await this.model.create(body); } catch (e) { return Promise.reject(e); }
    debug(result);
    return Promise.resolve(result);
  }

  async getAll(): Promise<T[]> {
    let collection: T[];
    try {
      collection = await this.model.find({});
    } catch (e) { return Promise.reject(e); }
    return Promise.resolve(collection);
  }

  async getAllSort(sort: SortOrder, query: QueryFilter = {}): Promise<T[]> {
    let collection: T[];
    try {
      collection = await this.model.findSort(query, sort);
    } catch (e) { return Promise.reject(e); }
    return Promise.resolve(collection);
  }

  findByIdAndUpdate(id: string | mongoose.Types.ObjectId, body: Partial<T>): Promise<T> {
    if (!id) return Promise.reject(new Error('id is invalid'));
    return this.model.findByIdAndUpdate(id, body)
      .then((doc) => {
        if (!doc) return Promise.reject(new Error('Id Not Found'));
        return Promise.resolve(doc as T);
      })
      .catch((e: Error) => Promise.reject(e));
  }

  deleteById(id: string | mongoose.Types.ObjectId): Promise<T> {
    if (!id) return Promise.reject(new Error('id is invalid'));
    return this.model.findByIdAndRemove(id)
      .then((doc) => {
        if (!doc) { return Promise.reject(new Error('Delete id not found')); }
        return Promise.resolve(doc as T);
      })
      .catch((e: Error) => Promise.reject(e));
  }
}

export default Controller;
