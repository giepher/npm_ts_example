import { Buffer } from 'buffer';
import { Module } from 'module'
import { EventEmitter } from 'events'
import * as Process from 'process';
import { ChildProcess, fork } from 'child_process';
import * as path from 'path';
import * as net from 'net';

/**
 * 结果
 * 2020/02/14 - 新建
 */
enum OPCode {
  failed = -1,
  ok = 0,
  progress = 1,
  abnormal = 2,
}
/**
 * 服务状态
 * 2020/02/14 - 新建
 */
enum ServiceCode {
  start = 1,
  stop,
}

type SendMsgResult = {
  code: OPCode;
  data?: any;
  error?: Error;
};

type ServerOptions = {
  port?: number;
  host?: string;
  path?: string;
  backlog?: number;
  exclusive?: boolean;
  allowHalfOpen?: boolean;
  pauseOnConnect?: boolean;
  readableAll?: boolean;
  writableAll?: boolean;
  ipv6Only?: boolean;
};

/**
 * 服务间消息
 * 2020/02/13 - 新建
 */
export type ServiceMessage = {
  target?: string[];
  broadcast?: boolean;
  source?: string;
  topic: string;
  timestamp?: number;
  fn?: string;
  data?: any;
};

/**
 * 服务配置信息
 * 2020/02/14 - 新建
 */
export type ServiceOptions = {
  name: string
  comment: string
  serviceName: any
  fork?: boolean
  conf?: string
  runOnce?: boolean
  startOnCreate?: boolean
  procMngr?: ServiceManager
};


/**
 * JSON客户端
 * 2020/02/14 - 新建
 */
abstract class JSONMsgClient { }

/**
 * JSON服务端
 * 2020/02/14 - 新建
 */
abstract class JSONMsgServer {
  private server: net.Server;
  private options: ServerOptions;
  static readonly DEFAULT_OPTIONS = {
    host: '127.0.0.1',
    port: 3000,
  };

  constructor(options?: ServerOptions) {
    this.options = options || JSONMsgServer.DEFAULT_OPTIONS;
    this.server = new net.Server(this.options);
    this.server.on('connection', this.onConnect);
  }

  /**
   * 检查服务器是否已开始监听
   * 2020/02/14 - 新建
   */
  listening(): boolean {
    return this.server.listening;
  }

  /**
   * 启动服务器
   * 2020/02/14 - 新建
   */
  start(options?: ServerOptions): void {
    this.options = options || JSONMsgServer.DEFAULT_OPTIONS;
    this.server.listen(this.options);
  }

  /**
   * 停止服务器
   * 2020/02/14 - 新建
   */
  stop(): void {
    this.server.close();
  }

  onConnect(socket: net.Socket): void {
    socket.on('data', this.onSocketData);
  }
  /**
   * 消息处理函数, 需要自定义处理逻辑
   * 2020/02/14 - 新建
   */
  abstract onServiceMessage(msg: ServiceMessage): void;

  /**
   * 接收数据函数
   * 2020/02/14 - 新建
   */
  protected onSocketData(data: Buffer) {
    let dataStr: string = data.toString();
    try {
      let msg: ServiceMessage = JSON.parse(dataStr);
      this.onServiceMessage(msg);
    } catch (e) {
      console.log(e);
    }
  }
}

// class ProcessMessageServer extends JSONMsgServer {
//     private processMngr: ServiceManager

//     onServiceMessage(msg: ServiceMessage) {

//     }
// }

/**
 * 服务类
 * 2020/02/14 - 新建
 */
export abstract class AService {
  protected file = __filename
  private nodeModule: any
  protected process: any
  protected subproc!: ChildProcess
  protected conf!: ServiceOptions
  protected status: ServiceCode = ServiceCode.stop

  constructor(conf: any) {
    if (conf instanceof Module) {
      this.nodeModule = conf
    }
    this.conf = conf ? conf : this.conf
    this.process = process
    if (this.isSubProcess()) {
      this.process.on('message', (msg: ServiceMessage) => { this.msgEmitter(msg) })
    } // End If
  }

  msgEmitter(msg: ServiceMessage) {
    switch (msg.topic) {
      case "__INIT":
        this.conf = msg.data
        break
      case "__START":
        this.start()
        break
      case "__STOP":
        this.stop()
        break
      case "__EXEC":
        break
      default:
        console.log('get msg', msg)
    }
  }

  protected isSubProcess(): boolean {
    return require.main == this.nodeModule
  }

  forkService(): void {
    this.subproc = fork(this.file)
  }

  /**
   * 服务进程获取消息
   * 2020/02/15 - 新建
   */
  sendToSelf(msg: ServiceMessage): boolean {
    return this.subproc != undefined &&
      this.subproc.connected &&
      this.subproc.send(msg)
  }

  sendToOther(msg: ServiceMessage): boolean {
    return process != undefined && process.send != undefined && process.send(msg);
  }

  stop(): void {
    if (this.isSubProcess()) {
      this.process.exit()
    } // End If
  }

  getName(): String {
    return this.conf.name
  }

  getServiceClass(): Function {
    return this.conf.serviceName
  }

  reload(): void { }
  abstract start(): void
}

/**
 * 服务进程管理
 * 2020/02/13 - 新建
 */
export class ServiceManager {
  private startOnCreate: boolean
  private srvMap: { [key: string]: AService };
  private confMap: { [key: string]: ServiceOptions };
  private srvArr: AService[];

  constructor() {
    this.srvMap = {};
    this.confMap = {};
    this.srvArr = new Array<AService>();
    this.startOnCreate = true
  }

  addService(opts: ServiceOptions): ServiceManager {
    try {
      opts.startOnCreate = opts.startOnCreate != undefined ?
        opts.startOnCreate :
        this.startOnCreate
      if (this.srvMap[opts.name] != undefined) {
        throw Error('Service ' + opts.name + ' has exist')
      } // End If
      let srv: AService = new opts.serviceName(opts)
      if (opts.fork) {
        srv.forkService()
        srv.sendToSelf({ topic: '__INIT', data: opts })
      }
      if (opts.startOnCreate) {
        srv.sendToSelf({ topic: '__START' })
      } // End If
      this.confMap[opts.name] = opts
      this.srvMap[opts.name] = srv
      this.srvArr.push(srv)
    } catch (e) {
      throw e
    }
    return this
  }

  getServices(keys: string[] | undefined, exclude?: boolean): AService[] {
    let rs: AService[] = new Array<AService>();
    if (!keys || keys.length <= 0) {
      return this.srvArr;
    } // End If
    let keyMaps: { [k: string]: boolean } = {};
    if (exclude) {
      for (var k in this.srvMap) {
        if (keys.indexOf(k) <= -1 && !keyMaps[k]) {
          rs.push(this.srvMap[k]);
          keyMaps[k] = true;
        } // End If
      } // End for-in
    } else {
      for (var i in keys) {
        let k = keys[i]
        if (!keyMaps[k] && this.srvMap[k] != undefined) {
          rs.push(this.srvMap[k]);
          keyMaps[k] = true;
        } // End If
      } // End for-in
    }
    return rs;
  }

  start(targets: string[]): void {
    this.send({ target: targets, topic: '__START' });
  }

  stop(targets: string[]): void {
    this.send({ target: targets, topic: '__STOP' });
  }

  stopAll(): void {
    this.send({ broadcast: true, topic: '__STOP' });
  }
  // abstract reload(name: string[]): void

  private __sendToService(targets: AService[], msg: ServiceMessage): void {
    for (var i in targets) {
      targets[i].sendToSelf(msg);
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
