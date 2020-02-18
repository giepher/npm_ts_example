import { AService, ServiceOptions } from '../src/index'

export class SecondService extends AService {
  protected file = __filename

  start() {
    console.log('Test process' + this.conf.name + ' start')
    process.exit()
  }

}

if (require.main === module) {
  new SecondService(module);
}
