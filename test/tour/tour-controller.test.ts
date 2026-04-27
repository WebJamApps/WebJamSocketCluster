import mongoose from 'mongoose';
import controller from '../../src/model/tour/tour-controller.js';

describe('TourController', () => {
  const testId = new mongoose.Types.ObjectId();
  it('deletes all tours', async () => {
    controller.model.deleteMany = vi.fn(() => Promise.resolve(true));
    const result = await controller.deleteAllDocs();
    expect(result).toBe(true);
  });
  it('throws error on deletes all tours', async () => {
    controller.model.deleteMany = vi.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.deleteAllDocs()).rejects.toThrow('bad');
  });
  it('throws error on make one tour', async () => {
    controller.model.create = vi.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.createDocs({})).rejects.toThrow('bad');
  });
  it('handles error on gets all tours sorted', async () => {
    controller.model.findSort = vi.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.getAllSort({})).rejects.toThrow('bad');
  });
  it('deletes tour by id', async () => {
    controller.model.findByIdAndRemove = vi.fn(() => Promise.resolve(true));
    const result = await controller.deleteById(testId);
    expect(result).toBe(true);
  });
  it('throws error on delete by id', async () => {
    controller.model.findByIdAndRemove = vi.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.deleteById(testId)).rejects.toThrow('bad');
  });
  it('detects a bad id', async () => {
    const anyId:any = '';
    await expect(controller.deleteById(anyId)).rejects.toThrow('id is invalid');
  });
  it('fails to delete', async () => {
    controller.model.findByIdAndRemove = vi.fn(() => Promise.resolve());
    await expect(controller.deleteById(testId)).rejects.toThrow('Delete id not found');
  });
  it('updates a tour by id', async () => {
    controller.model.findByIdAndUpdate = vi.fn(() => Promise.resolve(true));
    const r = await controller.findByIdAndUpdate(testId, {});
    expect(r).toBe(true);
  });
  it('updates a tour by id but none found to update', async () => {
    controller.model.findByIdAndUpdate = vi.fn(() => Promise.resolve());
    await expect(controller.findByIdAndUpdate(testId, {})).rejects.toThrow('Id Not Found');
  });
  it('should wait unit tests finish before exiting', async () => {
    const delay = (ms: any) => new Promise((resolve) => { setTimeout(() => resolve(true), ms); });
    await delay(1000);
  });
});
