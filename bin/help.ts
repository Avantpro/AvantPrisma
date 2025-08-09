import { FgMagenta ,FgWhite } from '../src/utils/console-colors'
import path from 'path'

export default async () => {

  const outputDir = process.cwd()
  const avantFolder = path.join(outputDir, 'avant')

  console.log(`${FgMagenta}------------- AvantPrisma ---------------${FgWhite}`);
  console.log();
  console.log(`
  
    init  - Gera o schema base em "${avantFolder}"

    build - Gera o clinete finalpara uso no codigo
  
  `);

}