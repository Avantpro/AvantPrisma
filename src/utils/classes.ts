import { Optional, Binary, OneRequired, Relations, WhereFilters, Filter, OmitRelations } from '../types/helpers/index'
import * as dotenv from 'dotenv'
dotenv.config()

type findArgs<T> = {
  where?: OneRequired< WhereFilters<T> >
  select?: Binary<OmitRelations<T> >
  include?: Relations<T>
}

type findUniqueArgs<T> = findArgs<T> & {
  where: OneRequired< WhereFilters<T> >
}

type updateArgs<T> = {
  where: OneRequired< WhereFilters<T> >
  data: OmitRelations<T>
}

type deleteArgs<T> = {
  where: OneRequired<WhereFilters<T> >
}

type Defaults = {
  [key: string]: string | number
}

type TableRelations = {
  [key: string]: {
    field: string,
    references: string
  }
}

class AvantTable<T> {
  private name: string
  private uniques: string[]
  private defaults: Defaults
  private relations: TableRelations

  constructor(name: string, uniques: string[], defaults: Defaults, relations: TableRelations){
    this.name = name
    this.uniques = uniques
    this.defaults = defaults
    this.relations = relations
  }


  public findMany(args?: findArgs<T>){
    if(!args) return `SELECT * FROM ${this.name}`
    const where = args.where ? this.#whereQuery(args.where) : ''
    const fields = args.select ? this.#fieldsQuery(args.select, !!args.include) : '*'
    const join = args.include ? this.#joinQuery(args.include) : ''
    return `SELECT ${fields} FROM ${this.name} ${where} ${join}`
  }

  public findUnique(args: findUniqueArgs<T>){
    const fields = args.select ? this.#fieldsQuery(args.select, !!args.include) : '*'
    const whereCols = Object.keys(args.where)
    const join = args.include ? this.#joinQuery(args.include) : ''
    if(!this.uniques.some(u => whereCols.includes(u))) throw new Error('Find unique requires at least one unique property')
    return `SELECT ${fields} FROM ${this.name} ${this.#whereQuery(args.where)} ${join}`
  }

  public create(data: OmitRelations<T>){
    let dataBuffer = data as { [key: string]: any }
    const defaultKeys = Object.keys(this.defaults)
    defaultKeys.forEach(k => {
      if(!dataBuffer[k]) dataBuffer[k] = this.defaults[k]
    })
    const fields = `(${Object.keys(dataBuffer).join(', ')})`
    let values = Object.values(dataBuffer)
    values = values.map(v => {
      if(typeof v == 'string') return `'${v}'`
      else return v
    })
    return `INSERT INTO ${this.name} ${fields} VALUES (${values.join(', ')});`
  }

  public update(args: updateArgs<T>){
    let setQuery = ''
    const where = this.#whereQuery(args.where)
    const keys = Object.keys(args.data)
    const values = Object.values(args.data)
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]
      let v = values[i]
      if(typeof v == 'string') v = `'${v}'`
      
      setQuery += `${k}=${v}`
      if(!(i + 1 == keys.length)) setQuery += ', '
    }
    return `UPDATE ${this.name} SET ${setQuery} ${where}`
  }

  public delete(args: deleteArgs<T>){
    const whereCols = Object.keys(args.where)
    if(!this.uniques.some(u => whereCols.includes(u))) throw new Error('Delete requires at least one unique property')
  }

  #whereQuery (where: OneRequired<WhereFilters<T> >) {
    const keys = Object.keys(where)
    let acc = 0
    let query: string = 'WHERE '
    for (const prop in where) {
      if (Object.prototype.hasOwnProperty.call(where, prop)) {
        query += prop.toUpperCase() + ' '

        const key = where[prop]
        const filter = key instanceof Object ? Object.keys(key)[0] as Filter : 'equals'
        let value = key instanceof Object ? Object.values(key)[0] : key

        switch (filter) {
          case 'contains':
            query += `LIKE '%${value}%'`
            break;
          case 'startsWith':
            query += `LIKE '${value}%'`
            break;
          case 'endsWith':
            query += `LIKE '%${value}'`
            break;
          case 'equals':
            if(typeof value === 'string') value = `'${value}'`
            query += `= ${value}`
            break;
          case 'in':
            query += `IN (${value.join(', ')})`
            break;
          case 'notIn':
            query += `NOT IN (${value.join(', ')})`
            break;
          case 'not':
            query += `!= ${value}`
            break;
          case 'gt':
            query += `> ${value}`
            break;
          case 'gte':
            query += `>= ${value}`
            break;
          case 'lt':
            query += `< ${value}`
            break;
          case 'lte':
            query += `<= ${value}`
            break;
          case 'between':
            query += `BETWEEN ${value[0]} AND ${value[1]}`
            break;
          default:
            break;
        }

        acc++
        if(acc < keys.length) query += ` AND `
      }
    }
    return query
  }

  #fieldsQuery (select: Binary<OmitRelations<T>>, join: boolean){
    let keys = Object.keys(select)
    keys = keys.filter((_k, i) => Object.values(select)[i])
    if(join) keys = keys.map(k => `${this.name}.${k}`)
    return keys.join(', ').toUpperCase()
  }

  #joinQuery (include: Relations<T>){
    let prefix = process.env.AVANT_PREFIX || ''
    let joinQuery = ''
    for (const key in include) {
      if (Object.prototype.hasOwnProperty.call(include, key)) {
        if(include[key]) {
          const k = prefix + key.toUpperCase()
          joinQuery += `LEFT JOIN ${k} ON ${this.name}.${this.relations[k].field} = ${k}.${this.relations[k].references};`
        }
      }
    }
    return joinQuery
  }

}

export { AvantTable }