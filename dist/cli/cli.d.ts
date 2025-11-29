import { Command } from 'commander';
export declare function createProgram(): Promise<Command>;
export declare function execute(rawArgs: string[]): Promise<void>;
