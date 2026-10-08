import type socketClusterServer from 'socketcluster-server';
import type ConsumableStream from 'consumable-stream';
import agServerUtils from '../../src/app/agServerUtils.js';
import AgController from '../../src/AgController/index.js';
import utils from '../../src/AgController/utils.js';
import GigController from '../../src/model/gig/gig-controller.js';
import JamPicsController from '../../src/model/jamPics/jamPics-controller.js';

describe('agServerUtils', () => {
  let r: boolean;
  const aStub: unknown = {
    exchange: { transmitPublish: () => {} },
    listener: (name: string) => ({
      once: () => {
        if (name === 'error') return Promise.resolve({ error: 'bad' });
        if (name === 'warning') return Promise.resolve({ warning: 'too hot' });
        return Promise.resolve({ socket: { receiver: () => ({ once: () => Promise.resolve(123) }) } });
      },
      createConsumer: () => ({
        next: () => Promise.resolve({
          done: true,
          value: {
            id: '123',
            socket: {
              listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
              transmit: () => {},
              receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
            },
          },
        }),
      }),
    }),
  };
  it('handles errors and warnings', async () => {
    r = await agServerUtils.handleErrAndWarn(2, 8888, aStub as socketClusterServer.AGServer);
    expect(r).toBe(true);
  });
  it('should wait unit tests finish before exiting', async () => {
    const delay = (ms: number) => new Promise((resolve) => { setTimeout(() => resolve(true), ms); });
    await delay(1000);
  });
  it('should handleConnecions', async () => {
    const socket = { done: true, value: { id: 'id' } };
    const c = { next: vi.fn(() => Promise.resolve(socket)) } as unknown as ConsumableStream.Consumer<socketClusterServer.AGServer.ConnectionData>;
    const addSocketMock = vi.fn();
    const a = { addSocket: addSocketMock } as unknown as AgController;
    expect(await agServerUtils.handleConnections(c, a)).toBe(undefined);
    expect(addSocketMock).toHaveBeenCalledWith(socket.value);
  });
  describe('routing startup', () => {
    const envs = ['production', 'development', 'test', undefined] as const;
    envs.forEach((env) => {
      it(`calls resetData and does not call any delete method when NODE_ENV is ${env ?? 'unset'}`, async () => {
        const origEnv = process.env.NODE_ENV;
        if (env === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = env;
        }
        const gigDeleteSpy = vi.spyOn(GigController, 'deleteAllDocs');
        const jamDeleteSpy = vi.spyOn(JamPicsController, 'deleteAllDocs');
        const resetDataSpy = vi.spyOn(AgController.prototype, 'resetData').mockResolvedValue();
        try {
          const res = await agServerUtils.routing(aStub as socketClusterServer.AGServer);
          expect(res).toBe(true);
          expect(resetDataSpy).toHaveBeenCalled();
          expect(gigDeleteSpy).not.toHaveBeenCalled();
          expect(jamDeleteSpy).not.toHaveBeenCalled();
        } finally {
          gigDeleteSpy.mockRestore();
          jamDeleteSpy.mockRestore();
          resetDataSpy.mockRestore();
          if (origEnv === undefined) {
            delete process.env.NODE_ENV;
          } else {
            process.env.NODE_ENV = origEnv;
          }
        }
      });
    });

    it('executes routing startup calling utils.resetData without deleting', async () => {
      const gigDeleteSpy = vi.spyOn(GigController, 'deleteAllDocs');
      const jamDeleteSpy = vi.spyOn(JamPicsController, 'deleteAllDocs');
      const utilsResetSpy = vi.spyOn(utils, 'resetData').mockResolvedValue(true);
      try {
        const res = await agServerUtils.routing(aStub as socketClusterServer.AGServer);
        expect(res).toBe(true);
        expect(utilsResetSpy).toHaveBeenCalled();
        expect(gigDeleteSpy).not.toHaveBeenCalled();
        expect(jamDeleteSpy).not.toHaveBeenCalled();
      } finally {
        gigDeleteSpy.mockRestore();
        jamDeleteSpy.mockRestore();
        utilsResetSpy.mockRestore();
      }
    });
  });
});
