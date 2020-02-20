const appUtils = require('../../controller/appUtils');

describe('appUtils', () => {
  it('sets up the express app', () => {
    const res = { status: () => ({ send: (msg) => { expect(msg).toBe('OK'); } }) };
    const eStub = { get: (route, cb) => { cb({}, res); } };
    const hStub = { listener: () => ({ once: () => ({}) }) };
    appUtils.setup(eStub, hStub);
  });
});
