/// <reference types="node" />
import { ChildProcess } from 'child_process';
/**
 * 服务状态
 * 2020/02/14 - 新建
 */
declare enum ServiceCode {
    start = 1,
    stop = 2
}
/**
 * 服务间消息
 * 2020/02/13 - 新建
 */
export declare type ServiceMessage = {
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
 * 2020/02/14 - 新建
 */
export declare abstract class AService {
    protected file: string;
    private nodeModule;
    protected process: any;
    protected subproc: ChildProcess;
    protected conf: ServiceOptions;
    protected status: ServiceCode;
    constructor(conf: any);
    msgEmitter(msg: ServiceMessage): void;
    protected isSubProcess(): boolean;
    forkService(): void;
    /**
     * 服务进程获取消息
     * 2020/02/15 - 新建
     */
    sendToSelf(msg: ServiceMessage): boolean;
    sendToOther(msg: ServiceMessage): boolean;
    stop(): void;
    getName(): String;
    getServiceClass(): Function;
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
    addService(opts: ServiceOptions): ServiceManager;
    getServices(keys: string[] | undefined, exclude?: boolean): AService[];
    start(targets: string[]): void;
    stop(targets: string[]): void;
    stopAll(): void;
    private __sendToService;
    broadcast(msg: ServiceMessage): void;
    send(msg: ServiceMessage): ServiceManager;
}
export {};
