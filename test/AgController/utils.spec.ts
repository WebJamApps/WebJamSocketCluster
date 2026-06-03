/* eslint-disable @typescript-eslint/no-explicit-any */
import utils from '#src/AgController/utils.js';

describe('AgController/utils', () => {
  it('resetData catches error', async () => {
    const deleteAllDocs = vi.fn(() => Promise.reject(new Error('bad')));
    const result = await utils.resetData({} as any, {} as any, { deleteAllDocs } as any, {} as any);
    expect(result).toBe(false);
  });
  it('handleGig is successful', async () => {
    const transmitPublish = vi.fn();
    const server = { exchange: { transmitPublish } };
    const gigController = { create: vi.fn(() => Promise.resolve()) };
    await utils.handleGig('create', {} as any, 'created', gigController, server as any);
    expect(transmitPublish).toHaveBeenCalled();
  });
  it('removeGig', async () => {
    const transmitPublish = vi.fn();
    const server = { exchange: { transmitPublish } };
    const client = { socket: { transmit: vi.fn() } };
    const receiver = { value: { token: 'token', tour: { tourId: 'asdf' } } };
    const gigController = { deleteById: vi.fn(() => Promise.resolve()) };
    await utils.removeGig(receiver, client, gigController, server);
    expect(transmitPublish).toHaveBeenCalled();
  });
  it('removeGig catches error', async () => {
    const transmitPublish = vi.fn();
    const server = { exchange: { transmitPublish } };
    const client = { socket: { transmit: vi.fn() } };
    const receiver = { value: { token: 'token', tour: { tourId: 'asdf' } } };
    const gigController = { deleteById: vi.fn(() => Promise.reject(new Error('bad'))) };
    await utils.removeGig(receiver, client, gigController, server);
    expect(transmitPublish).not.toHaveBeenCalled();
    expect(client.socket.transmit).toHaveBeenCalled();
  });
});
