import Busboy, { type BusboyConfig, type FileInfo } from 'busboy'
import * as crypto from 'crypto'
import { type FastifyPluginAsync, type FastifyRequest } from 'fastify'
import FastifyPlugin from 'fastify-plugin'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

export const kIsMultipart = Symbol.for('[FastifyMultipart.isMultipart]')
export const kIsMultipartParsed = Symbol.for('[FastifyMultipart.isMultipartParsed]')
export const kFileSavedPaths = Symbol.for('[FastifyMultipart.fileSavedPaths]')

export interface File extends FileInfo {
  filepath: string
}

export type Files = Record<string, File | File[]>
export type Fields = Record<string, string | string[]>

declare module 'fastify' {
  interface FastifyRequest {
    files: Files | null
    parseMultipart: <Payload = any>(this: FastifyRequest, options?: Omit<BusboyConfig, 'headers'>) => Promise<Payload>
    [kIsMultipart]: boolean
    [kIsMultipartParsed]: boolean
    [kFileSavedPaths]: string[]
  }
}

export interface FastifyBusboyOptions {
  addContentTypeParser?: boolean
  addHooks?: boolean
  removeFilesFromBody?: boolean
  busboy?: Omit<BusboyConfig, 'headers'>
  uploadDir?: string
}

function update (obj: Fields, name: string, value: string): void
function update (obj: Files, name: string, value: File): void
function update (obj: any, name: string, value: string | File): void {
  if (Array.isArray(obj[name])) {
    // when multiple value exist
    obj[name].push(value)
  } else if (typeof obj[name] !== 'undefined') {
    // when already assigned
    obj[name] = [obj[name], value]
  } else {
    // when not assigned
    obj[name] = value
  }
}

function buildRequestParser (config: BusboyConfig): (request: FastifyRequest, options?: Pick<FastifyBusboyOptions, 'removeFilesFromBody' | 'uploadDir'>) => Promise<{ body: Fields, files: Files }> {
  const busboy = Busboy(config)
  const body = Object.create(null)
  const files = Object.create(null)
  return async function (request: FastifyRequest, options?: Pick<FastifyBusboyOptions, 'removeFilesFromBody' | 'uploadDir'>): Promise<{ body: Fields, files: Files }> {
    if (request[kIsMultipartParsed]) {
      request.log.warn('multipart already parsed, you probably need to check your code why it is parsed twice.')
      return { body: request.body as Fields, files: request.files as Files }
    }
    let ended = false
    let error: null | Error = null
    // must be string
    const uploadDir = (options as any).uploadDir as string
    // must be here
    const removeFilesFromBody = (options as any).removeFilesFromBody as undefined | boolean

    return await new Promise(function (resolve, reject) {
      function onDone (): void {
        if (ended) return
        request[kIsMultipartParsed] = true
        ended = true
        if (error !== null) {
          reject(error)
        } else {
          resolve({ body, files })
        }
      }

      busboy.on('field', function (name, value, info) {
        if (info.valueTruncated) {
          error = Error('Field Size Limit Reached')
          return
        }
        update(body, name, value)
      })
      busboy.on('fieldsLimit', function () {
        error = Error('Fields Limit Reached')
      })
      busboy.on('file', function (name, value, info) {
        // we auto skip when error exists
        if (error !== null) {
          value.resume()
          return
        }
        const filename = `${crypto.randomUUID()}${path.extname(info.filename)}`
        const filepath = path.join(uploadDir, filename)
        const stream = fs.createWriteStream(filepath)
        value.on('limit', function () {
          error = Error('File Size Limit Reached')
        })
        // safe guard for unknown error
        // we do not test this branch
        /* istanbul ignore next */
        value.on('error', function (err) {
          /* istanbul ignore next */
          error = err
        })
        value.on('end', function () {
          update(files, name, {
            ...info,
            filepath
          })
          // only provide to body when removeFilesFromBody is not true
          if (removeFilesFromBody !== true) update(body, name, filepath)
        })
        value.pipe(stream)
      })
      busboy.on('filesLimit', function () {
        error = Error('Files Limit Reached')
      })
      busboy.on('close', onDone)
      busboy.on('finish', onDone)
      request.raw.pipe(busboy)
    })
  }
}

const plugin: FastifyPluginAsync<FastifyBusboyOptions> = async function (fastify, options) {
  if (typeof options.uploadDir === 'string') {
    await fs.promises.mkdir(options.uploadDir, { recursive: true })
  } else {
    // we need an upload directory
    options.uploadDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'fastify-busboy-'))
  }

  fastify.decorateRequest(kIsMultipart, false)
  fastify.decorateRequest(kIsMultipartParsed, false)
  fastify.decorateRequest(kFileSavedPaths, null)
  fastify.decorateRequest('files', null)

  fastify.decorateRequest('parseMultipart', async function (this: FastifyRequest, decoratorOptions?: BusboyConfig) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const request = this

    const inlineOption = decoratorOptions ?? options.busboy ?? {}
    const parser = buildRequestParser({ ...inlineOption, headers: request.raw.headers })
    const { body, files } = await parser(request, { removeFilesFromBody: options.removeFilesFromBody, uploadDir: options.uploadDir })
    request.body = body
    request.files = files

    return body
  })

  if (options.addContentTypeParser === true && options.addHooks === true) {
    throw new Error('Cannot enable `addContentTypeParser` togather with `addHooks`')
  }

  if (options.addContentTypeParser === true) {
    fastify.addContentTypeParser('multipart', async function (request: FastifyRequest, _payload: any) {
      request[kIsMultipart] = true
      const parse = buildRequestParser({ ...options.busboy ?? {}, headers: request.raw.headers })
      const { body, files } = await parse(request, { removeFilesFromBody: options.removeFilesFromBody, uploadDir: options.uploadDir })
      request.files = files
      return body
    })
  } else {
    fastify.addContentTypeParser('multipart', function (request, _, done) {
      request[kIsMultipart] = true
      done(null)
    })
  }

  if (options.addHooks === true) {
    fastify.addHook('preValidation', async function (request: FastifyRequest) {
      // skip if it is not multipart
      if (!request[kIsMultipart]) return
      const parse = buildRequestParser({ ...options.busboy ?? {}, headers: request.raw.headers })
      const { body, files } = await parse(request, { removeFilesFromBody: options.removeFilesFromBody, uploadDir: options.uploadDir })
      request.body = body
      request.files = files
    })
  }
}

// we do not require this function anymore but we keep it
// we treat ajv to any because we do not want to deal with the ajv@6 and ajv@8 typing problem
export const ajvBinaryFormat = function (ajv: any): void {
  ajv.addFormat('binary', {
    type: 'string',
    validate (o: unknown) {
      // it must be string because we parse the file / binary and return the filepath
      return typeof o === 'string'
    }
  })
}
export const FastifyBusboy = FastifyPlugin(plugin, {
  fastify: '4.x',
  name: 'fastify-busboy',
  dependencies: []
})
export default FastifyBusboy
