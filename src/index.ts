import { Module } from 'module'
import { ChildProcess, fork } from 'child_process';

export enum Commands {
  PROCESS_INIT = '__INIT',
  PROCESS_START = '__START',
  PROCESS_STOP = '__STOP',
  CMD_EXEC = '__EXEC',
  CMD_CALLBACK = '__CALLBACK'
}

/**
 * 服务间消息
 * 2020/02/13 - 新建
 */
export type ServiceMessage = {
  target?: string[];
  broadcast?: boolean;
  source?: string;
  topic?: string;
  timestamp?: number;
  fn?: Function | string;
  data?: any;
};

/**
 * 服务配置信息
 * 2020/02/14 - 新建
 */
export type ServiceOptions = {
  name: string;
  comment: string;
  serviceName: any;
  fork?: boolean;
  conf?: string;
  runOnce?: boolean;
  startOnCreate?: boolean;
  procMngr?: ServiceManager;
};

/**
 * 服务类
 * 新建一个Serivce类, 在fork的情况下会创建一个进程, 进程通过ipc与管理器通信
 * 因为存在监听, fork状态的服务在执行完成后不会自动退出
 * 如果要退出需调用stop
 * 为了简化任务的创建和兼容不fork创建进程的方式, 采用 Service 与进程类放在一起
 * 这就导致本类的方法部分是子进程的(start, stop), 部分是Service对象的, 还有的是公共的(构造函数)
 * 2020/02/14 - 新建
 */
export abstract class AbstractService {
  [key: string]: any
  protected file = __filename
  private nodeModule: any
  protected process: any
  protected subproc!: ChildProcess
  protected conf!: ServiceOptions

  constructor(conf: any) {
    if (conf instanceof Module) {
      this.nodeModule = conf
    }
    this.conf = conf ? conf : this.conf
    this.process = process
    if (this.isSubProcess()) {
      this.process.on('message', (msg: ServiceMessage) => { this.processEmitter(msg) })
    }
  }

  addListener(proc: any, event: string, callback: Function) {
    if (proc.on instanceof Function) {
      console.log(typeof proc);
    } else {
      throw Error(this.getName() + " can't add listner: " + event)
    }
  }

  /**
   * 子进程消息处理方法
   * 2020/02/18 - 新建
   */
  processEmitter(msg: ServiceMessage) {
    switch (msg.topic) {
      case Commands.PROCESS_INIT:
        this.conf = msg.data
        break
      case Commands.PROCESS_START:
        this.start()
        break
      case Commands.PROCESS_STOP:
        this.stop()
        break
      case Commands.CMD_EXEC:
        this.callMethod(msg)
        break
      default:
        throw Error('topic ' + msg.topic + ' handler not defined')
    }
  }

  protected callMethod(msg: ServiceMessage): void {
    let fn: Function
    if (typeof msg.fn == 'undefined') {
      throw Error('topic ' + msg.topic + ' message must define fn: ' + JSON.stringify(msg))
    } // End If
    if (typeof (msg.fn) == 'string') {
      if (typeof this[msg.fn] != 'function') {
        throw Error(this.getName() + " havn't method " + msg.fn)
      } // End If
      fn = this[msg.fn]
    } else {
      fn = msg.fn
    }
    fn.apply(this, [msg])
  }

  /**
   * 服务消息处理方法
   * 2020/02/18 - 新建
   */
  serviceEmitter(msg: ServiceMessage, srvMgr?: ServiceManager): void {
    switch (msg.topic) {
      case Commands.CMD_CALLBACK:
        this.callMethod(msg)
        break
      default:
        srvMgr && srvMgr.send(msg)
    }
  }

  protected isSubProcess(): boolean {
    return require.main == this.nodeModule
  }

  forkService(srvMgs?: ServiceManager): void {
    this.subproc = fork(this.file)
    // this.subproc = fork(this.file,
    //   [],
    //   { execArgv: ['-r', 'ts-node/register'] })
    this.subproc.on('message', (msg: ServiceMessage) => { this.serviceEmitter(msg, srvMgs) })
  }

  isAlive(): boolean {
    return this.subproc && this.subproc.connected
  }

  /**
   * 从服务向进程发送消息
   * 在服务调用
   * 2020/02/15 - 新建
   */
  toProcess(msg: ServiceMessage): boolean {
    if (this.subproc && !this.subproc.connected) {
      throw Error('Service ' + this.getName() + ' has stoped')
    } // End If
    msg.source = this.getName()
    return this.isAlive() ? this.subproc.send(msg) : false
  }

  protected callback(msg: ServiceMessage): void {
    msg.topic = Commands.CMD_CALLBACK
    this.toService(msg)
  }

  toService(msg: ServiceMessage): boolean {
    if (!this.process || !this.process.send) {
      throw Error('process ' + this.getName() + ' no process or can not send:' + this.process)
    } // End If
    msg.source = this.getName()
    return this.process && this.process.send ? this.process.send(msg) : false
  }

  stop(): void {
    if (this.isSubProcess()) {
      this.process.exit()
    } // End If
  }

  getName(): string {
    return this.conf.name
  }

  reload(): void
  abstract start(): void
}

/**
 * 服务管理器
 * 2020/02/13 - 新建
 */
export class ServiceManager {
  private startOnCreate: boolean
  private srvMap: { [key: string]: AbstractService };
  private confMap: { [key: string]: ServiceOptions };
  private srvArr: AbstractService[];

  constructor() {
    this.srvMap = {};
    this.confMap = {};
    this.srvArr = new Array<AbstractService>();
    this.startOnCreate = true
  }

  /**
   * 创建并添加一个服务到管理器
   * 2020/02/27 - 新建
   */
  addService(opts: ServiceOptions): ServiceManager {
    try {
      opts.startOnCreate = opts.startOnCreate ?
        opts.startOnCreate :
        this.startOnCreate
      if (this.srvMap[opts.name]) {
        throw Error('Service ' + opts.name + ' has exist')
      } // End If
      if (typeof opts.fork == 'undefined') {
        opts.fork = true
      } // End If
      const srv: AbstractService = new opts.serviceName(opts)
      this.forkService(srv, opts)
      this.confMap[opts.name] = opts
      this.srvMap[opts.name] = srv
      this.srvArr.push(srv)
    } catch (e) {
      throw e
    }
    return this
  }

  /**
   * 根据服务名获取一个或多个服务, 可反转匹配
   * 2020/02/27 - 新建
   */
  getServices(keys?: string[], exclude?: boolean): AbstractService[] {
    const rs: AbstractService[] = new Array<AbstractService>();
    if (!keys || keys.length <= 0) {
      return this.srvArr;
    } // End If
    const keyMaps: { [k: string]: boolean } = {};
    if (exclude) {
      for (let in this.srvMap) {
        if (keys.indexOf(k) <= -1 && !keyMaps[k]) {
          rs.push(this.srvMap[k]);
          keyMaps[k] = true;
        } // End If
      } // End for-in
    } else {
      for (var i in keys) {
        let k = keys[i]
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
  protected forkService(srv: AbstractService, opts: ServiceOptions): AbstractService {
    if (opts.fork) {
      srv.forkService(this)
      srv.toProcess({ topic: Commands.PROCESS_INIT, data: opts })
      if (opts.startOnCreate) {
        srv.toProcess({ topic: Commands.PROCESS_START })
      } // End If
    }
    // TODO: 2020/02/27 - 非fork模式下的初始化与启动
    return srv
  }

  /**
   * 批量重启服务
   * 2020/02/27 - 新建
   */
  restart(targets: string[]): void {
    let srvs: AbstractService[] = this.getServices(targets)
    for (var i in srvs) {
      let srv = srvs[i]
      let opts = this.confMap[srv.getName()]
      if (!srv.isAlive()) {
        this.forkService(srv, opts)
      } // End If
    } // End for-in
  }

  AddListener(targets: string[], listener: Function): void {
  }

  start(targets: string[]): void {
    this.send({ target: targets, topic: Commands.PROCESS_START });
  }

  stop(targets: string[]): void {
    this.send({ target: targets, topic: Commands.PROCESS_STOP });
  }

  stopAll(): void {
    this.send({ broadcast: true, topic: Commands.PROCESS_STOP });
  }

  private __sendToService(targets: AbstractService[], msg: ServiceMessage): void {
    for (var i in targets) {
      targets[i].toProcess(msg);
    } // End for-in
  }

  broadcast(msg: ServiceMessage): void {
    msg.timestamp = msg.timestamp || Date.now();
    this.__sendToService(this.srvArr, msg);
  }

  send(msg: ServiceMessage): ServiceManager {
    if (!msg.broadcast && !msg.target) {
      throw Error('non broadcast message must have target');
    } // End If
    msg.timestamp = msg.timestamp || Date.now();
    if (msg.broadcast) {
      this.broadcast(msg);
    } else {
      this.__sendToService(this.getServices(msg.target), msg);
    }
    return this
  }

}
