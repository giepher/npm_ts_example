"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
class FirstService extends index_1.AService {
    constructor() {
        super(...arguments);
        this.file = __filename;
    }
    start() {
        console.log('Service ' + this.conf.name + ' start');
    }
}
exports.FirstService = FirstService;
if (require.main === module) {
    new FirstService(module);
}
