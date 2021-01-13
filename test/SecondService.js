"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecondService = void 0;
const index_1 = require("../src/index");
class SecondService extends index_1.AbstractService {
    constructor() {
        super(...arguments);
        this.file = __filename;
    }
    start() {
    }
    callSelf(msg) {
        this.callback({ fn: 'testCB', data: msg.data + 100 });
    }
}
exports.SecondService = SecondService;
if (require.main === module) {
    new SecondService(module);
}
