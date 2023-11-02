/* eslint-disable @typescript-eslint/no-explicit-any */
import utils from '../../src/AgController/utils';

describe('AgController/utils', () => {
  it('resetData catches error', async () => {
    const deleteAllDocs = jest.fn(() => Promise.reject(new Error('bad')));
    const result = await utils.resetData({} as any, {} as any, { deleteAllDocs } as any, {} as any);
    expect(result).toBe(false);
  });
  it('handleTour is successful', async () => {
    const transmitPublish = jest.fn();
    const server = { exchange: { transmitPublish } };
    const tourController = { create: jest.fn(() => Promise.resolve()) };
    await utils.handleTour('create', {} as any, 'created', tourController, server as any);
    expect(transmitPublish).toHaveBeenCalled();
  });
  it('removeTour', async () => {
    const transmitPublish = jest.fn();
    const server = { exchange: { transmitPublish } };
    const client = { socket: { transmit: jest.fn() } };
    const receiver = { value: { token: 'token', tour: { tourId: 'asdf' } } };
    const tourController = { deleteById: jest.fn(() => Promise.resolve()) };
    await utils.removeTour(receiver, client, tourController, server);
    expect(transmitPublish).toHaveBeenCalled();
  });
  it('removeTour catches error', async () => {
    const transmitPublish = jest.fn();
    const server = { exchange: { transmitPublish } };
    const client = { socket: { transmit: jest.fn() } };
    const receiver = { value: { token: 'token', tour: { tourId: 'asdf' } } };
    const tourController = { deleteById: jest.fn(() => Promise.reject(new Error('bad'))) };
    await utils.removeTour(receiver, client, tourController, server);
    expect(transmitPublish).not.toHaveBeenCalled();
    expect(client.socket.transmit).toHaveBeenCalled();
  });
});
