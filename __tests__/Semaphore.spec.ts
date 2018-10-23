import Semaphore from '../src';


const wait = ms => new Promise(r => setTimeout(r, ms));

describe('Semaphore', () => {
  it('without semaphore', async () => {
    let global = 0;

    const f = async () => {
      const local = global;
      await wait(500);
      global = local + 1;
    };

    f(); f(); await wait(1000);

    expect(global).toEqual(1);
  });

  it('with semaphore', async () => {
    let global = 0;
    const lock = new Semaphore(1);

    const f = async () => {
      await lock.wait();
      const local = global;
      await wait(500);
      global = local + 1;
      lock.signal();
    };

    f(); f(); await wait(1500);

    expect(global).toEqual(2);
  });

  it('with execute', async () => {
    let global = 0;
    const lock = new Semaphore(1);

    const f = async () => {
      const local = global;
      await wait(500);
      global = local + 1;
    };

    lock.execute(f);
    lock.execute(f);
    await wait(1500);

    expect(global).toEqual(2);
  });

  it('with a negative number of initial permits', async () => {
    const sem = new Semaphore(-2);
    let global = 0;

    (async () => {
      await sem.wait();
      expect(global).toEqual(3);
    })();

    setTimeout(() => {
      global += 1;
      sem.signal();
      setTimeout(() => {
        global += 1;
        sem.signal();
        setTimeout(() => {
          global += 1;
          sem.signal();
          setTimeout(() => {
            global += 1;
            sem.signal();
          }, 0);
        }, 0);
      }, 0);
    }, 0);
  });

  it('using waitFor successfully', async () => {
    const sem = new Semaphore(0);

    (async () => {
      const didAcquire = await sem.waitFor(1000);
      expect(didAcquire).toBeTruthy();
    })();

    await wait(500);
    sem.signal();
  });

  it('using waitFor unsuccessfully', async () => {
    const sem = new Semaphore(0);

    (async () => {
      const didAcquire = await sem.waitFor(1000);
      expect(didAcquire).toBeFalsy();
    })();

    await wait(1500);
    sem.signal();
  });

  it('tryAcquire successfully', async () => {
    const sem = new Semaphore(1);
    expect(sem.tryAcquire()).toBeTruthy();
  });

  it('tryAcquire unsuccessfully', async () => {
    const sem = new Semaphore(0);
    expect(sem.tryAcquire()).toBeFalsy();
  });

  it('wait after failed waitFor', async () => {
    const sem = new Semaphore(1);
    let global = 0;

    const f = async () => {
      await sem.wait();
      const local = global;
      await wait(500);
      global = local + 1;
      sem.signal();
    };

    f();
    const waitSuccessful = await sem.waitFor(100);
    expect(waitSuccessful).toBeFalsy();
    f();
    await wait(1500);

    expect(global).toEqual(2);
  });

  it('drain permits', async () => {
    const sem = new Semaphore(3);
    expect(sem.drainPermits()).toEqual(3);
  });

  it('execute return value', async () => {
    const sem = new Semaphore(1);
    const ret = await sem.execute(() => 1);
    expect(ret).toEqual(1);

    const t = [2, 1];
    const r = await Promise.all(t.map(time => sem.execute(async () => {
      await wait(time * 1000);
      return time * 1000;
    })));
    expect(r).toEqual([2000, 1000]);
  });

  it('should alias acquire and lock to wait and signal', async () => {
    let global = 0;
    const lock = new Semaphore(1);

    const f = async () => {
      await lock.acquire();
      const local = global;
      await wait(500);
      global = local + 1;
      lock.release();
    };

    f(); f(); await wait(1500);

    expect(global).toEqual(2);
  });

  it('using finishAll', async () => {
    let global = 0;
    const lock = new Semaphore(1);

    const f = async () => {
      await lock.wait();
      const local = global;
      await wait(500);
      global = local + 1;
      lock.signal();
    };

    f(); f(); f(); f();
    await lock.finishAll();

    expect(global).toEqual(4);
  });

  it('should update the number of max permits', async () => {
    let global = 0;
    const sem = new Semaphore(2);

    const f = async () => {
      await sem.acquire();
      await wait(500);
      global += 1;
    };

    f(); f(); f(); await wait(1500);
    expect(global).toEqual(2);
    sem.updateMaxPermits(3); await wait(1000);
    expect(global).toEqual(3);
  });
});
