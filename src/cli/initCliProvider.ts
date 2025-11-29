import { createReadStream, promises as fs } from 'fs';
import { EOL } from 'os';
import { dirname, extname, isAbsolute, join } from 'path';

import { fileProvider, userInteractionProvider } from '../io';
import * as models from '../models';

export async function initIOProvider(): Promise<void> {
  initFileProvider();
  await initUserInteractionProvider();
  initFixTestSymbols();
}

function initFixTestSymbols() {
  if (process.platform === 'win32') {
    // https://github.com/nodejs/node-v0.x-archive/issues/7940
    models.testSymbols.ok = '[x]';
    models.testSymbols.error = '[-]';
    models.testSymbols.skipped = '[*]';
  }
}

export function initFileProvider(): void {
  fileProvider.EOL = EOL;
  fileProvider.isAbsolute = async (path: models.PathLike) => isAbsolute(fileProvider.toString(path));
  fileProvider.dirname = (path: string) => dirname(fileProvider.toString(path));
  fileProvider.hasExtension = (fileName: models.PathLike, ...extensions: Array<string>) => {
    let extension = extname(fileProvider.toString(fileName));
    if (extension.startsWith('.')) {
      extension = extension.slice(1);
    }
    return extensions.indexOf(extension) >= 0;
  };
  fileProvider.joinPath = (path: models.PathLike, joinPath: string): models.PathLike =>
    join(fileProvider.toString(path), joinPath);

  fileProvider.exists = async (path: models.PathLike): Promise<boolean> => {
    try {
      return !!(await fs.stat(fileProvider.toString(path)));
    } catch {
      return false;
    }
  };
  fileProvider.readFile = async (fileName: models.PathLike, encoding: models.FileEncoding): Promise<string> => {
    const file = fileProvider.fsPath(fileName);
    if (file) {
      return fs.readFile(file, encoding);
    }
    throw new Error('No valid path for cli');
  };
  fileProvider.readBuffer = async (fileName: models.PathLike) => {
    const file = fileProvider.fsPath(fileName);
    if (file) {
      const stream = createReadStream(file);
      return toBuffer(stream);
    }
    throw new Error('No valid path for cli');
  };
  fileProvider.writeBuffer = (fileName: models.PathLike, buffer: Buffer) =>
    fs.writeFile(fileProvider.toString(fileName), buffer);
  fileProvider.readdir = async (dirname: models.PathLike): Promise<string[]> =>
    fs.readdir(fileProvider.toString(dirname));
}

function toBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];
    stream.on('data', obj => {
      if (Buffer.isBuffer(obj)) {
        buffers.push(obj);
      } else {
        buffers.push(Buffer.from(obj));
      }
    });
    stream.on('end', () => resolve(Buffer.concat(buffers)));
    stream.on('error', error => reject(error));
    stream.resume();
  });
}

async function initUserInteractionProvider() {
  // uctest is non-interactive - these functions return defaults or error
  userInteractionProvider.showNote = async function showNote(note: string) {
    console.log(`Note: ${note}`);
    return true; // Auto-confirm
  };
  userInteractionProvider.showInputPrompt = async function showInputPrompt(
    _message: string,
    defaultValue?: string,
    _maskedInput?: boolean
  ) {
    // Return default value if available, otherwise error
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error('Interactive input not supported in uctest. Use --var to pass values.');
  };
  userInteractionProvider.showListPrompt = async function showListPrompt(_message: string, values: string[]) {
    // Return first option if available
    if (values.length > 0) {
      return values[0];
    }
    throw new Error('Interactive selection not supported in uctest.');
  };
  userInteractionProvider.getClipboard = async function getClipboard() {
    return '';
  };
  userInteractionProvider.setClipboard = async function setClipboard(_message: string) {
    // No-op
  };
}
