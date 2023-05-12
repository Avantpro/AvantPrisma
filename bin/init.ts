import fs from 'fs'
import path from 'path'

export default async () => {

  const outputDir = process.cwd()
  const avantFolder = path.join(outputDir, 'avant')

  if(fs.existsSync(path.join(outputDir, 'schema.avant'))) {
    console.log('schema.avant already exists')
    process.exit(1) 
  }
  if(fs.existsSync(avantFolder)) {
    console.log('avant folder already exists')
    process.exit(1) 
  }
  if(fs.existsSync(path.join(avantFolder, 'schema.avant'))) {
    console.log('schema.avant already exists')
    process.exit(1) 
  }

  if(!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  }

  if(!fs.existsSync(avantFolder)) {
    fs.mkdirSync(avantFolder)
  }

  const userSchema = "schema User {\r\n  id string $id\r\n  email string $unique\r\n  name string? $default('Unknown')\r\n  role *Role $relation(fields: [roleId], references: [id])\r\n  roleId string\r\n  age number\r\n}";
  const roleSchema = "schema Role {\r\n  id string $id\r\n  name string\r\n  user *User[] $relation(fields: [id], references: [roleId])\r\n}"

  const defaultSchema = userSchema + "\r\n\r\n" + roleSchema


  fs.writeFileSync(path.join(avantFolder, 'schema.avant'), defaultSchema)
}