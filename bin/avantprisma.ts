#!/usr/bin/env node

import { FgRed,FgWhite } from '../src/utils/console-colors'

import help from './help'
import init from './init'
import build from '../src/build'

console.log(`${FgRed} ---------------------------------------- ${FgWhite}`);

let argLimpo:string

try {
  argLimpo = process.argv[2]?.toLowerCase();
} catch (error) {
  argLimpo = ''
}

switch (argLimpo) {
  case 'help':
    help()
    break;
  
  case 'init':
    init()
    break;

  case 'build':
    build()
    break;

  default:
    help()
    break;
}