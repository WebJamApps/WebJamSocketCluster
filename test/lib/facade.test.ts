import type mongoose from 'mongoose';
import Facade from '../../src/lib/facade.js';

describe('Facade', () => {
  it('gets all sorted', async () => {
    const schema = {
      find: () => ({ sort: () => ({ lean: () => ({ exec: () => Promise.resolve(true) }) }) }),
    };
    const facade = new Facade(schema as unknown as mongoose.Model<Record<string, unknown>>);
    const result = await facade.findSort({}, {});
    expect(result).toBe(true);
  });
  it('throws error on gets all sorted', async () => {
    const schema = {
      find: () => ({ sort: () => ({ lean: () => ({ exec: () => Promise.reject(new Error('bad')) }) }) }),
    };
    const facade = new Facade(schema as unknown as mongoose.Model<Record<string, unknown>>);
    await expect(facade.findSort({}, {})).rejects.toThrow('bad');
  });
  it('handles error on find', async () => {
    const schema = {
      find: () => ({ lean: () => ({ exec: () => Promise.reject(new Error('bad')) }) }),
    };
    const facade = new Facade(schema as unknown as mongoose.Model<Record<string, unknown>>);
    await expect(facade.find({})).rejects.toThrow('bad');
  });
  it('find succeeds', async () => {
    const schema = {
      find: () => ({ lean: () => ({ exec: () => Promise.resolve({ test: true }) }) }),
    };
    const facade = new Facade(schema as unknown as mongoose.Model<Record<string, unknown>>);
    const result = await facade.find({});
    expect((result as unknown as { test: boolean }).test).toBe(true);
  });
  it('findByIdAndRemove calls the model\'s findByIdAndDelete (mongoose 9.x removed findByIdAndRemove, JaMmusic#1199)', async () => {
    const schema = {
      findByIdAndDelete: () => ({ lean: () => ({ exec: () => Promise.resolve(true) }) }),
    };
    const facade = new Facade(schema as unknown as mongoose.Model<Record<string, unknown>>);
    const result = await facade.findByIdAndRemove('');
    expect(result).toBe(true);
  });
  it('findByIdAndRemove propagates a rejection from findByIdAndDelete', async () => {
    const schema = {
      findByIdAndDelete: () => ({ lean: () => ({ exec: () => Promise.reject(new Error('bad')) }) }),
    };
    const facade = new Facade(schema as unknown as mongoose.Model<Record<string, unknown>>);
    await expect(facade.findByIdAndRemove('')).rejects.toThrow('bad');
  });
  it('findByIdAndUpdate', async () => {
    const schema = {
      findByIdAndUpdate: () => ({ lean: () => ({ exec: () => Promise.resolve(true) }) }),
    };
    const facade = new Facade(schema as unknown as mongoose.Model<Record<string, unknown>>);
    const result = await facade.findByIdAndUpdate('', {});
    expect(result).toBe(true);
  });
});
