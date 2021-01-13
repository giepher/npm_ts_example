/// <reference types="node" />
import { ChildProcess } from 'child_process';
export declare enum Commands {
    PROCESS_INIT = "__INIT",
    PROCESS_START = "__START",
    PROCESS_STOP = "__STOP",
    CMD_EXEC = "__EXEC",
    CMD_CALLBACK = "__CALLBACK"
}
/**
 * 服务间消息
 * 2020/02/13 - 新建
 */
export declare type ServiceMessage = {
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
export declare type ServiceOptions = {
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
export declare abstract class AbstractService {
    [key: string]: any;
    protected file: string;
    private nodeModule;
    protected process: any;
    protected subproc: ChildProcess;
    protected conf: ServiceOptions;
    constructor(conf: any);
    addListener(proc: any, event: string, callback: Function): void;
    /**
     * 子进程消息处理方法
     * 2020/02/18 - 新建
     */
    processEmitter(msg: ServiceMessage): void;
    protected callMethod(msg: ServiceMessage): void;
    /**
     * 服务消息处理方法
     * 2020/02/18 - 新建
     */
    serviceEmitter(msg: ServiceMessage, srvMgr?: ServiceManager): void;
    protected isSubProcess(): boolean;
    forkService(srvMgs?: ServiceManager): void;
    isAlive(): boolean;
    /**
     * 从服务向进程发送消息
     * 在服务调用
     * 2020/02/15 - 新建
     */
    toProcess(msg: ServiceMessage): boolean;
    protected callback(msg: ServiceMessage): void;
    toService(msg: ServiceMessage): boolean;
    stop(): void;
    getName(): string;
    reload(): void;
    abstract start(): void;
}
/**
 * 服务进程管理
 * 2020/02/13 - 新建
 */
export declare class ServiceManager {
    private startOnCreate;
    private srvMap;
    private confMap;
    private srvArr;
    constructor();
    /**
     * 创建并添加一个服务到管理器
     * 2020/02/27 - 新建
     */
    addService(opts: ServiceOptions): ServiceManager;
    /**
     * 根据服务名获取一个或多个服务, 可反转匹配
     * 2020/02/27 - 新建
     */
    getServices(keys?: string[], exclude?: boolean): AbstractService[];
    /**
     * 启动一个服务
     * 如果允许fork(默认为允许),则启动一个新进程
     * 2020/02/27 - 新建
     */
    protected forkService(srv: AbstractService, opts: ServiceOptions): AbstractService;
    /**
     * 批量重启服务
     * 2020/02/27 - 新建
     */
    restart(targets: string[]): void;
    AddListener(targets: string[], listener: Function): void;
    start(targets: string[]): void;
    stop(targets: string[]): void;
    stopAll(): void;
    private __sendToService;
    broadcast(msg: ServiceMessage): void;
    send(msg: ServiceMessage): ServiceManager;
}
