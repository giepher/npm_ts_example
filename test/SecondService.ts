import { AbstractService, ServiceMessage, ServiceManager } from '../src/index'

export class SecondService extends AbstractService {
  protected file = __filename

  start() {
  }

  callSelf(msg: ServiceMessage) {
    this.callback({ fn: 'testCB', data: msg.data + 100 })
  }

}

if (require.main === module) {
  new SecondService(module);
}
