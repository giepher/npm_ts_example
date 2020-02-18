"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const module_1 = require("module");
const child_process_1 = require("child_process");
const net = require("net");
/**
 * 结果
 * 2020/02/14 - 新建
 */
var OPCode;
(function (OPCode) {
    OPCode[OPCode["failed"] = -1] = "failed";
    OPCode[OPCode["ok"] = 0] = "ok";
    OPCode[OPCode["progress"] = 1] = "progress";
    OPCode[OPCode["abnormal"] = 2] = "abnormal";
})(OPCode || (OPCode = {}));
/**
 * 服务状态
 * 2020/02/14 - 新建
 */
var ServiceCode;
(function (ServiceCode) {
    ServiceCode[ServiceCode["start"] = 1] = "start";
    ServiceCode[ServiceCode["stop"] = 2] = "stop";
})(ServiceCode || (ServiceCode = {}));
/**
 * JSON客户端
 * 2020/02/14 - 新建
 */
class JSONMsgClient {
}
/**
 * JSON服务端
 * 2020/02/14 - 新建
 */
class JSONMsgServer {
    constructor(options) {
        this.options = options || JSONMsgServer.DEFAULT_OPTIONS;
        this.server = new net.Server(this.options);
        this.server.on('connection', this.onConnect);
    }
    /**
     * 检查服务器是否已开始监听
     * 2020/02/14 - 新建
     */
    listening() {
        return this.server.listening;
    }
    /**
     * 启动服务器
     * 2020/02/14 - 新建
     */
    start(options) {
        this.options = options || JSONMsgServer.DEFAULT_OPTIONS;
        this.server.listen(this.options);
    }
    /**
     * 停止服务器
     * 2020/02/14 - 新建
     */
    stop() {
        this.server.close();
    }
    onConnect(socket) {
        socket.on('data', this.onSocketData);
    }
    /**
     * 接收数据函数
     * 2020/02/14 - 新建
     */
    onSocketData(data) {
        let dataStr = data.toString();
        try {
            let msg = JSON.parse(dataStr);
            this.onServiceMessage(msg);
        }
        catch (e) {
            console.log(e);
        }
    }
}
JSONMsgServer.DEFAULT_OPTIONS = {
    host: '127.0.0.1',
    port: 3000,
};
// class ProcessMessageServer extends JSONMsgServer {
//     private processMngr: ServiceManager
//     onServiceMessage(msg: ServiceMessage) {
//     }
// }
/**
 * 服务类
 * 2020/02/14 - 新建
 */
class AService {
    constructor(conf) {
        this.file = __filename;
        this.status = ServiceCode.stop;
        if (conf instanceof module_1.Module) {
            this.nodeModule = conf;
        }
        this.conf = conf ? conf : this.conf;
        this.process = process;
        if (this.isSubProcess()) {
            this.process.on('message', (msg) => { this.msgEmitter(msg); });
        } // End If
    }
    msgEmitter(msg) {
        switch (msg.topic) {
            case "__INIT":
                this.conf = msg.data;
                break;
            case "__START":
                this.start();
                break;
            case "__STOP":
                this.stop();
                break;
            case "__EXEC":
                break;
            default:
                console.log('get msg', msg);
        }
    }
    isSubProcess() {
        return require.main == this.nodeModule;
    }
    forkService() {
        this.subproc = child_process_1.fork(this.file);
    }
    /**
     * 服务进程获取消息
     * 2020/02/15 - 新建
     */
    sendToSelf(msg) {
        return this.subproc != undefined &&
            this.subproc.connected &&
            this.subproc.send(msg);
    }
    sendToOther(msg) {
        return process != undefined && process.send != undefined && process.send(msg);
    }
    stop() {
        if (this.isSubProcess()) {
            this.process.exit();
        } // End If
    }
    getName() {
        return this.conf.name;
    }
    getServiceClass() {
        return this.conf.serviceName;
    }
    reload() { }
}
exports.AService = AService;
/**
 * 服务进程管理
 * 2020/02/13 - 新建
 */
class ServiceManager {
    constructor() {
        this.srvMap = {};
        this.confMap = {};
        this.srvArr = new Array();
        this.startOnCreate = true;
    }
    addService(opts) {
        try {
            opts.startOnCreate = opts.startOnCreate != undefined ?
                opts.startOnCreate :
                this.startOnCreate;
            let srv = new opts.serviceName(opts);
            if (opts.fork) {
                srv.forkService();
                srv.sendToSelf({ topic: '__INIT', data: opts });
            }
            if (opts.startOnCreate) {
                srv.sendToSelf({ topic: '__START' });
            } // End If
            this.confMap[opts.name] = opts;
            this.srvMap[opts.name] = srv;
            this.srvArr.push(srv);
        }
        catch (e) {
            throw e;
        }
        return this;
    }
    getServices(keys, exclude) {
        let rs = new Array();
        if (!keys || keys.length <= 0) {
            return this.srvArr;
        } // End If
        let keyMaps = {};
        if (exclude) {
            for (var k in this.srvMap) {
                if (keys.indexOf(k) <= -1 && !keyMaps[k]) {
                    rs.push(this.srvMap[k]);
                    keyMaps[k] = true;
                } // End If
            } // End for-in
        }
        else {
            for (var i in keys) {
                let k = keys[i];
                if (!keyMaps[k] && this.srvMap[k] != undefined) {
                    rs.push(this.srvMap[k]);
                    keyMaps[k] = true;
                } // End If
            } // End for-in
        }
        return rs;
    }
    start(targets) {
        this.send({ target: targets, topic: '__START' });
    }
    stop(targets) {
        this.send({ target: targets, topic: '__STOP' });
    }
    stopAll() {
        this.send({ broadcast: true, topic: '__STOP' });
    }
    // abstract reload(name: string[]): void
    __sendToService(targets, msg) {
        for (var i in targets) {
            targets[i].sendToSelf(msg);
        } // End for-in
    }
    broadcast(msg) {
        msg.timestamp = msg.timestamp || Date.now();
        this.__sendToService(this.srvArr, msg);
    }
    send(msg) {
        if (!msg.broadcast && !msg.target) {
            throw Error('non broadcast message must have target');
        } // End If
        msg.timestamp = msg.timestamp || Date.now();
        if (msg.broadcast) {
            this.broadcast(msg);
        }
        else {
            this.__sendToService(this.getServices(msg.target), msg);
        }
        return this;
    }
}
exports.ServiceManager = ServiceManager;
