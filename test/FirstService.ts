import { AService } from '../src/index'

export class FirstService extends AService {
  protected file = __filename

  start() {
    console.log('Service ' + this.conf.name + ' start')
  }

}
if (require.main === module) {
  new FirstService(module);
}
