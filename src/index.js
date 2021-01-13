"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceManager = exports.AbstractService = exports.Commands = void 0;
const module_1 = require("module");
const child_process_1 = require("child_process");
var Commands;
(function (Commands) {
    Commands["PROCESS_INIT"] = "__INIT";
    Commands["PROCESS_START"] = "__START";
    Commands["PROCESS_STOP"] = "__STOP";
    Commands["CMD_EXEC"] = "__EXEC";
    Commands["CMD_CALLBACK"] = "__CALLBACK";
})(Commands = exports.Commands || (exports.Commands = {}));
/**
 * 服务类
 * 新建一个Serivce类, 在fork的情况下会创建一个进程, 进程通过ipc与管理器通信
 * 因为存在监听, fork状态的服务在执行完成后不会自动退出
 * 如果要退出需调用stop
 * 为了简化任务的创建和兼容不fork创建进程的方式, 采用 Service 与进程类放在一起
 * 这就导致本类的方法部分是子进程的(start, stop), 部分是Service对象的, 还有的是公共的(构造函数)
 * 2020/02/14 - 新建
 */
class AbstractService {
    constructor(conf) {
        this.file = __filename;
        if (conf instanceof module_1.Module) {
            this.nodeModule = conf;
        }
        this.conf = conf ? conf : this.conf;
        this.process = process;
        if (this.isSubProcess()) {
            this.process.on('message', (msg) => { this.processEmitter(msg); });
        }
    }
    addListener(proc, event, callback) {
        if (proc.on instanceof Function) {
            console.log(typeof proc);
        }
        else {
            throw Error(this.getName() + " can't add listner: " + event);
        }
    }
    /**
     * 子进程消息处理方法
     * 2020/02/18 - 新建
     */
    processEmitter(msg) {
        switch (msg.topic) {
            case Commands.PROCESS_INIT:
                this.conf = msg.data;
                break;
            case Commands.PROCESS_START:
                this.start();
                break;
            case Commands.PROCESS_STOP:
                this.stop();
                break;
            case Commands.CMD_EXEC:
                this.callMethod(msg);
                break;
            default:
                throw Error('topic ' + msg.topic + ' handler not defined');
        }
    }
    callMethod(msg) {
        let fn;
        if (typeof msg.fn == 'undefined') {
            throw Error('topic ' + msg.topic + ' message must define fn: ' + JSON.stringify(msg));
        } // End If
        if (typeof (msg.fn) == 'string') {
            if (typeof this[msg.fn] != 'function') {
                throw Error(this.getName() + " havn't method " + msg.fn);
            } // End If
            fn = this[msg.fn];
        }
        else {
            fn = msg.fn;
        }
        fn.apply(this, [msg]);
    }
    /**
     * 服务消息处理方法
     * 2020/02/18 - 新建
     */
    serviceEmitter(msg, srvMgr) {
        switch (msg.topic) {
            case Commands.CMD_CALLBACK:
                this.callMethod(msg);
                break;
            default:
                srvMgr && srvMgr.send(msg);
        }
    }
    isSubProcess() {
        return require.main == this.nodeModule;
    }
    forkService(srvMgs) {
        this.subproc = child_process_1.fork(this.file);
        // this.subproc = fork(this.file,
        //   [],
        //   { execArgv: ['-r', 'ts-node/register'] })
        this.subproc.on('message', (msg) => { this.serviceEmitter(msg, srvMgs); });
    }
    isAlive() {
        return this.subproc && this.subproc.connected;
    }
    /**
     * 从服务向进程发送消息
     * 在服务调用
     * 2020/02/15 - 新建
     */
    toProcess(msg) {
        if (this.subproc && !this.subproc.connected) {
            throw Error('Service ' + this.getName() + ' has stoped');
        } // End If
        msg.source = this.getName();
        return this.isAlive() ? this.subproc.send(msg) : false;
    }
    callback(msg) {
        msg.topic = Commands.CMD_CALLBACK;
        this.toService(msg);
    }
    toService(msg) {
        if (!this.process || !this.process.send) {
            throw Error('process ' + this.getName() + ' no process or can not send:' + this.process);
        } // End If
        msg.source = this.getName();
        return this.process && this.process.send ? this.process.send(msg) : false;
    }
    stop() {
        if (this.isSubProcess()) {
            this.process.exit();
        } // End If
    }
    getName() {
        return this.conf.name;
    }
    reload() { }
}
exports.AbstractService = AbstractService;
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
    /**
     * 创建并添加一个服务到管理器
     * 2020/02/27 - 新建
     */
    addService(opts) {
        try {
            opts.startOnCreate = opts.startOnCreate ?
                opts.startOnCreate :
                this.startOnCreate;
            if (this.srvMap[opts.name]) {
                throw Error('Service ' + opts.name + ' has exist');
            } // End If
            if (typeof opts.fork == 'undefined') {
                opts.fork = true;
            } // End If
            let srv = new opts.serviceName(opts);
            this.forkService(srv, opts);
            this.confMap[opts.name] = opts;
            this.srvMap[opts.name] = srv;
            this.srvArr.push(srv);
        }
        catch (e) {
            throw e;
        }
        return this;
    }
    /**
     * 根据服务名获取一个或多个服务, 可反转匹配
     * 2020/02/27 - 新建
     */
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
                if (!keyMaps[k] && this.srvMap[k]) {
                    rs.push(this.srvMap[k]);
                    keyMaps[k] = true;
                } // End If
            } // End for-in
        }
        return rs;
    }
    /**
     * 启动一个服务
     * 如果允许fork(默认为允许),则启动一个新进程
     * 2020/02/27 - 新建
     */
    forkService(srv, opts) {
        if (opts.fork) {
            srv.forkService(this);
            srv.toProcess({ topic: Commands.PROCESS_INIT, data: opts });
            if (opts.startOnCreate) {
                srv.toProcess({ topic: Commands.PROCESS_START });
            } // End If
        }
        // TODO: 2020/02/27 - 非fork模式下的初始化与启动
        return srv;
    }
    /**
     * 批量重启服务
     * 2020/02/27 - 新建
     */
    restart(targets) {
        let srvs = this.getServices(targets);
        for (var i in srvs) {
            let srv = srvs[i];
            let opts = this.confMap[srv.getName()];
            if (!srv.isAlive()) {
                this.forkService(srv, opts);
            } // End If
        } // End for-in
    }
    AddListener(targets, listener) {
    }
    start(targets) {
        this.send({ target: targets, topic: Commands.PROCESS_START });
    }
    stop(targets) {
        this.send({ target: targets, topic: Commands.PROCESS_STOP });
    }
    stopAll() {
        this.send({ broadcast: true, topic: Commands.PROCESS_STOP });
    }
    __sendToService(targets, msg) {
        for (var i in targets) {
            targets[i].toProcess(msg);
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
