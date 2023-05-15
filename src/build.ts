import fs from 'fs'
import path from 'path'
import * as dotenv from 'dotenv'
import { compile } from './tsBuild'
import * as ts from "typescript";

export default async () => {
  dotenv.config()

  const schemaPath = path.join(process.cwd(), 'avant')
  let data: string = ''
  try {
    data = fs.readFileSync(`${schemaPath}/schema.avant`, 'utf-8')
  } catch (error) {
    console.log(error)
    console.log('schema.avant not found')
    process.abort()
  }

  if (data == '') {
    console.log("Can't read schema.avant")
    process.abort()
  }

  const prefix = process.env.AVANT_PREFIX || 'BLACK_'

  const modelsName = data.split('schema').filter(v => v.trim() != '').map(v => v.split('{')[0].trim())

  const models: string[] = []
  modelsName.forEach(m => {
    let start = data.indexOf(`schema ${m} {`) + `schema ${m} {`.length
    let buffer = data.substring(start, data.length)
    models.push(
      buffer.substring(0, buffer.indexOf('}'))
    )
  })

  const modelsUniques: string[][] = []
  models.forEach(m => {
    const uniqueProps: string[] = []
    const props = m.split('\r\n').filter(v => v.trim() != '').map(v => v.trim())
    props.forEach(p => {
      if (p.includes('$unique') || p.includes('$id')) uniqueProps.push(p.split(' ')[0])
    })
    modelsUniques.push(uniqueProps)
  })

  type Default = {
    [key: string]: any
  }

  const modelsDefaults: Default[] = []
  models.forEach(m => {
    let defaultProps: Default = {}
    const props = m.split('\r\n').filter(v => v.trim() != '').map(v => v.trim()).filter(p => p.includes('$default'))
    props.forEach(p => {
      let defaultValue: any = p.substring(p.indexOf('$default(') + 9, p.length - 1)
      if (typeof defaultValue == 'string') defaultValue = defaultValue.substring(1, defaultValue.length - 1)

      defaultProps[p.split(' ')[0]] = defaultValue
    })
    modelsDefaults.push(defaultProps)
  })

  type Relations = {
    [key: string]: {
      field: string,
      references: string
    }
  }

  const modelsRelations: Relations[] = []
  models.forEach(m => {
    let relations: Relations = {}
    const props = m.split('\r\n').filter(v => v.trim() != '').map(v => v.trim()).filter(p => p.includes('$relation'))
    props.forEach(p => {
      let relation = p.substring(p.indexOf('$relation(') + 10, p.length - 1)
      const field = relation.substring(relation.indexOf('fields:') + 7, relation.indexOf(']')).replace('[', '').trim()
      const references = relation.substring(relation.indexOf('references:') + 11, relation.indexOf(']', relation.indexOf('references:'))).replace('[', '').trim()
      relations[prefix + p.split(' ')[1].replace('*', '').replace('[]', '').toUpperCase()] = {
        field,
        references
      }
    })
    modelsRelations.push(relations)
  })

  const typesEvals: string[] = []
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    let mType = ''
    let imports = ''
    const props = m.split('\r\n').filter(v => v.trim() != '').map(v => v.trim())
    props.forEach(p => {
      let property = p.split(' ')[0]
      let type = (p.split(' ')[1])
      if (type.includes('*')) {
        type = type.replace('*', '')
        imports += `import ${type.replace('[]', '')} from './${type.replace('[]', '')}Schema'\n`
      }
      if (type.includes('?')) {
        type = type.replace('?', ' | null')
        property += '?'
      } else if (p.includes('$id') || p.includes(`$default`)) property += '?'
      mType += `\n\t${property}: ${type}${props.indexOf(p) == props.length - 1 ? '\n' : ','}`
    })
    typesEvals.push(`${imports}\ntype ${modelsName[i]} = {${mType}} \n\nexport default ${modelsName[i]}`)
  }

  const schemasFolder = path.resolve(__dirname, 'types', 'schemas')
  try {
    if (!fs.existsSync(schemasFolder)) fs.mkdirSync(schemasFolder)
  } catch (err) {
    console.log(err)
    process.abort()
  }

  fs.readdir(schemasFolder, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlinkSync(path.join(schemasFolder, file))
    }
  })

  for (let i = 0; i < typesEvals.length; i++) {
    const type = typesEvals[i];
    fs.writeFileSync(`${schemasFolder}/${modelsName[i]}Schema.ts`, type)
  }

  let schemasImports = ''
  let clientTablesDefinition = ''
  let clientTablesConstructor = ''
  for (let i = 0; i < models.length; i++) {
    const name = modelsName[i]
    schemasImports += `import ${name} from './types/schemas/${name}Schema'\n`
    clientTablesDefinition += `${name.toLowerCase()}: AvantTable< ${name} >\n\t`
    clientTablesConstructor += `this.${name.toLowerCase()} = new AvantTable< ${name} >("${prefix + name.toUpperCase()}", ${JSON.stringify(modelsUniques[i])}, ${JSON.stringify(modelsDefaults[i])}, ${JSON.stringify(modelsRelations[i])})\n\t\t`
  }

  const index = `
import { AvantTable } from './utils/classes'
${schemasImports}
class AvantClient {
  ${clientTablesDefinition}
  constructor(){
    ${clientTablesConstructor}
  }
}

export default AvantClient
export { ${modelsName.join(', ')} }
`

  const indexPath = path.resolve(__dirname)
  fs.writeFileSync(`${indexPath}/index.ts`, index)

  const filesBuffer: string[] = [`${indexPath}/index.ts`]
  fs.readdir(schemasFolder, (err, files) => {
    if (err) throw err;
    for (const file of files) {
      filesBuffer.push(path.join(schemasFolder, file))
    }
  })

  compile(filesBuffer, {
    "target": ts.ScriptTarget.ES5,                                  
    // "lib": ["ES2015"],      
    "experimentalDecorators": true,                  
    "emitDecoratorMetadata": true,  
    "module": ts.ModuleKind.CommonJS, 
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true, 
    "strict": true,   
    "skipLibCheck": true,
    "declaration": true,     
  })
}