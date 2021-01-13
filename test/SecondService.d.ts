import { AbstractService, ServiceMessage } from '../src/index';
export declare class SecondService extends AbstractService {
    protected file: string;
    start(): void;
    callSelf(msg: ServiceMessage): void;
}
