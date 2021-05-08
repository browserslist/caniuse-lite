import path from 'path'
import { promises as fs } from 'fs'

const getContentsFactory = base => files =>
  Promise.all(
    files.map(file =>
      fs.readFile(path.join(base, file), 'utf8').then(data => ({
        name: path.basename(file, '.json'),
        contents: JSON.parse(data)
      }))
    )
  )

export default getContentsFactory
