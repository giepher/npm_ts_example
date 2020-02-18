import { ServiceManager, ServiceOptions } from '../src/index'
import { FirstService } from './FirstService.js'
import { SecondService } from './SecondService.js'

beforeAll(async () => {
  const { exec } = require('child_process');
  function cplServiceTs() {
    return new Promise((resolve, reject) => {
      exec('tsc -p ./test/tsconfig.json', (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error(`exec error: ${error}`);
          console.log(stdout);
          reject(error)
        }
        resolve();
      });
    });
  }
  await cplServiceTs();
});

test('Create instance', () => {
  expect(new ServiceManager()).toBeInstanceOf(ServiceManager)
})

test('Add a TypeScript Service', async () => {
  let sm = new ServiceManager().addService({
    name: 'TS0',
    comment: "It's a test service",
    fork: true,
    serviceName: FirstService
  })
  sm.stop(['TS0']);
})


test('Add multiple services', async () => {
  jest.setTimeout(1100)
  let sopt = [{
    name: 'TS1',
    comment: "yet another service",
    fork: true,
    serviceName: FirstService
  },
  {
    name: 'TS2',
    comment: "yet another service",
    fork: true,
    serviceName: FirstService
  }]
  let sm = new ServiceManager()
  for (var k in sopt) {
    sm.addService(sopt[k])
  } // End for-in
  // sopt.name = 'TS2'
  // sm.addService(sopt)
  // sm.start(['TS1', 'ST2'])
  sm.stop(['TS1', 'TS2'])
  // await new Promise((resolve, reject) => {
  //   setTimeout(() => {
  //     sm.stopAll()
  //     resolve();
  //   }, 1000)
  // })
})

// test('Send stop to service', async () => {
//   expect(new ServiceManager().addService({
//     name: 'TestService',
//     comment: "It's a test service",
//     fork: true,
//     serviceName: FirstService
//   }).stop(['TestService'])).toBe(undefined)
// })
