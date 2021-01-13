"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const FirstService_js_1 = require("./FirstService.js");
const SecondService_js_1 = require("./SecondService.js");
let sm;
let sMap = {};
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}
beforeAll(async () => {
    const { exec } = require('child_process');
    function cplServiceTs() {
        return new Promise((resolve, reject) => {
            exec('tsc -p ./test/tsconfig.json', (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    console.log(stdout);
                    reject(error);
                }
                resolve();
            });
        });
    }
    await cplServiceTs();
    sm = new index_1.ServiceManager();
    let opt_proto = {
        name: 'TS',
        comment: "yet another service",
        serviceName: FirstService_js_1.FirstService
    };
    for (let i = 1; i < 5; i++) {
        let opt = Object.assign({}, opt_proto);
        opt.name = opt.name + '_' + i;
        sm.addService(opt);
        sMap[opt.name] = sm.getServices([opt.name])[0];
    } // End for-in
    let opt = {
        name: 'TS_10',
        comment: "yet another service",
        serviceName: SecondService_js_1.SecondService
    };
    sm.addService(opt);
    sMap[opt.name] = sm.getServices([opt.name])[0];
});
test('Create ServiceManager instance', () => {
    expect(sm).toBeInstanceOf(index_1.ServiceManager);
});
test('Create Service instance', async () => {
    jest.setTimeout(100);
    let opt = {
        name: 'TS_0',
        comment: "yet another service",
        serviceName: FirstService_js_1.FirstService
    };
    sm.addService(opt);
    let s = sm.getServices(['TS_0'])[0];
    expect(s).toBeInstanceOf(index_1.AbstractService);
    expect(s.isAlive()).toBe(true);
});
test('Stop service', async () => {
    let sname = 'TS_0';
    let s = sm.getServices([sname])[0];
    expect(s).toBeInstanceOf(index_1.AbstractService);
    expect(s.isAlive()).toBe(true);
    sm.stop([sname]);
    await sleep(40);
    expect(s.isAlive()).toBe(false);
});
test('Restart service', async () => {
    let sname = 'TS_1';
    let s = sm.getServices([sname])[0];
    expect(s).toBeInstanceOf(index_1.AbstractService);
    expect(s.isAlive()).toBe(true);
    sm.stop([sname]);
    await sleep(40);
    expect(s.isAlive()).toBe(false);
    sm.restart([sname]);
    expect(s.isAlive()).toBe(true);
});
test('Send msg to service and get callback', async () => {
    let sname = 'TS_10';
    let s = sm.getServices([sname])[0];
    s.testCB = (data) => {
        expect(data.source).toBe(sname);
        expect(data.data).toBe(200);
    };
    sm.send({ target: [sname], topic: '__EXEC', fn: 'callSelf', data: 100 });
});
afterAll(async () => {
    for (let k in sMap) {
        if (sMap[k].isAlive()) {
            sm.stop([k]);
        } // End If
    } // End for-in
});
