'use strict';

const { createShutdownHandler } = require('../index');

describe('Graceful Shutdown (P3-11)', () => {
  it('executes shutdown sequence: stops listener, closes server, returns 0', async () => {
    let listenerStopped = false;
    let serverClosed = false;

    const mockBlockchain = {
      stopEventListener: () => {
        listenerStopped = true;
      },
    };

    const mockServer = {
      close: (cb) => {
        serverClosed = true;
        cb(null);
      },
    };

    const shutdown = await createShutdownHandler(mockServer, mockBlockchain);
    const exitCode = await shutdown('SIGTERM');

    expect(exitCode).toBe(0);
    expect(listenerStopped).toBe(true);
    expect(serverClosed).toBe(true);
  });
});
