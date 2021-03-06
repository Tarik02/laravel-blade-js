import { Environment } from '../environment/Environment';

export type RuntimeFunction = (env: Environment, ...args: any[]) => AsyncIterable<string>;
