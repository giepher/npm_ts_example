import { AbstractService } from '../src/index'

export class FirstService extends AbstractService {
  protected file = __filename

  start() {
    // console.log('Service ' + this.conf.name + ' start')
  }

  stop() {
    // console.log('Service ' + this.conf.name + ' stopped')
    super.stop()
  }
}
if (require.main === module) {
  new FirstService(module);
}
