#!/usr/bin/env node

import { FgRed,FgWhite } from '../src/utils/consoleColors'

import help from './help'
import init from './init'
import build from '../src/build'

console.log(`${FgRed} ---------------------------------------- ${FgWhite}`);

switch (process.argv[2]) {
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