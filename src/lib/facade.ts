import type mongoose from 'mongoose';
import type { SortOrder, QueryFilter } from '../types/index.js';

class Facade<T = Record<string, unknown>> {
  Schema: mongoose.Model<T>;

  constructor(Schema: mongoose.Model<T>) {
    this.Schema = Schema;
  }

  create(input: Partial<T> | Partial<T>[]): Promise<T | T[]> {
    return this.Schema.create(input as never);
  }

  async find(query: QueryFilter): Promise<T[]> {
    let result: T[];
    try { result = await this.Schema.find(query).lean().exec(); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(result);
  }

  async findSort(query: QueryFilter, sort: SortOrder): Promise<T[]> {
    let result: T[];
    try {
      result = await this.Schema.find(query).sort(sort as Record<string, 1 | -1>).lean().exec();
    } catch (e) { return Promise.reject(e); }
    return Promise.resolve(result);
  }

  deleteMany(query: QueryFilter): Promise<unknown> {
    return this.Schema.deleteMany(query).exec();
  }

  findByIdAndUpdate(id: string | mongoose.Types.ObjectId, update: Partial<T>): Promise<T | null> {
    return this.Schema.findByIdAndUpdate(id, update, { returnDocument: 'after' }).lean().exec();
  }

  findByIdAndRemove(id: string | mongoose.Types.ObjectId): Promise<T | null> {
    return this.Schema.findByIdAndDelete(id).lean().exec();
  }
}

export default Facade;
