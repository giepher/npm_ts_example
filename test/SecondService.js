"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
class SecondService extends index_1.AService {
    constructor() {
        super(...arguments);
        this.file = __filename;
    }
    start() {
        console.log('Test process' + this.conf.name + ' start');
        process.exit();
    }
}
exports.SecondService = SecondService;
if (require.main === module) {
    new SecondService(module);
}
