import { ServiceManager, AbstractService } from '../src/index'
import { FirstService } from './FirstService.js'
import { SecondService } from './SecondService.js'
let sm: ServiceManager
let sMap: { [k: string]: AbstractService } = {}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms)
  })
}

beforeAll(async () => {
  const { exec } = require('child_process')
  function cplServiceTs() {
    return new Promise((resolve, reject) => {
      exec('tsc -p ./test/tsconfig.json', (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error(`exec error: ${error}`)
          console.log(stdout)
          reject(error)
        }
        resolve()
      })
    })
  }
  await cplServiceTs()
  sm = new ServiceManager()
  let opt_proto = {
    name: 'TS',
    comment: "yet another service",
    serviceName: FirstService
  }

  for (let i = 1; i < 5; i++) {
    let opt = { ...opt_proto }
    opt.name = opt.name + '_' + i
    sm.addService(opt)
    sMap[opt.name] = sm.getServices([opt.name])[0]
  } // End for-in

  let opt = {
    name: 'TS_10',
    comment: "yet another service",
    serviceName: SecondService
  }
  sm.addService(opt)
  sMap[opt.name] = sm.getServices([opt.name])[0]
})

test('Create ServiceManager instance', () => {
  expect(sm).toBeInstanceOf(ServiceManager)
})

test('Create Service instance', async () => {
  jest.setTimeout(100)
  let opt = {
    name: 'TS_0',
    comment: "yet another service",
    serviceName: FirstService
  }
  sm.addService(opt)
  let s = sm.getServices(['TS_0'])[0]
  expect(s).toBeInstanceOf(AbstractService)
  expect(s.isAlive()).toBe(true)
})

test('Stop service', async () => {
  let sname = 'TS_0'
  let s = sm.getServices([sname])[0]
  expect(s).toBeInstanceOf(AbstractService)
  expect(s.isAlive()).toBe(true)
  sm.stop([sname])
  await sleep(40)
  expect(s.isAlive()).toBe(false)
})

test('Restart service', async () => {
  let sname = 'TS_1'
  let s = sm.getServices([sname])[0]
  expect(s).toBeInstanceOf(AbstractService)
  expect(s.isAlive()).toBe(true)
  sm.stop([sname])
  await sleep(40)
  expect(s.isAlive()).toBe(false)
  sm.restart([sname])
  expect(s.isAlive()).toBe(true)
})

test('Send msg to service and get callback', async () => {
  let sname = 'TS_10'
  let s = sm.getServices([sname])[0]
  s.testCB = (data: any) => {
    expect(data.source).toBe(sname)
    expect(data.data).toBe(200)
  }
  sm.send({ target: [sname], topic: '__EXEC', fn: 'callSelf', data: 100 })
})

afterAll(async () => {
  for (let k in sMap) {
    if (sMap[k].isAlive()) {
      sm.stop([k])
    } // End If
  } // End for-in
})
