"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirstService = void 0;
const index_1 = require("../src/index");
class FirstService extends index_1.AbstractService {
    constructor() {
        super(...arguments);
        this.file = __filename;
    }
    start() {
        // console.log('Service ' + this.conf.name + ' start')
    }
    stop() {
        // console.log('Service ' + this.conf.name + ' stopped')
        super.stop();
    }
}
exports.FirstService = FirstService;
if (require.main === module) {
    new FirstService(module);
}
