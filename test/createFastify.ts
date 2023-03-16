import fastifySwagger from '@fastify/swagger'
import { type BusboyConfig } from 'busboy'
import Fastify, { type FastifyInstance } from 'fastify'
import FastifyBusboy, { ajvBinaryFormat, type FastifyBusboyOptions } from '../lib'

// reduce keep alive to prevent `undici` keep the socket open
export const fastifyOptions = { keepAliveTimeout: 100 }

export async function createFastify (t: Tap.Test, options?: FastifyBusboyOptions, inline?: boolean | BusboyConfig): Promise<FastifyInstance> {
  inline ??= false
  const fastify = Fastify(fastifyOptions)

  await fastify.register(FastifyBusboy, options)

  fastify.post<{ Body: { foo: string, file: string } }>('/', async function (request, reply) {
    if (inline === true) await request.parseMultipart()
    if (typeof inline === 'object') await request.parseMultipart(inline)
    return await reply.code(200).send({
      body: request.body,
      files: request.files
    })
  })

  await fastify.listen({ port: 0 })

  t.teardown(fastify.close)

  return await fastify
}

export async function createIntegrationFastify (t: Tap.Test, options: FastifyBusboyOptions, schema: any, inline: boolean = false): Promise<FastifyInstance> {
  const fastify = Fastify({
    ...fastifyOptions,
    ajv: {
      plugins: [ajvBinaryFormat]
    }
  })

  await fastify.register(FastifyBusboy, options)
  await fastify.register(fastifySwagger)

  fastify.post<{ Body: { foo: string, file: string } }>('/', {
    schema
  }, async function (request, reply) {
    if (inline) await request.parseMultipart()
    return await reply.code(200).send({
      body: request.body,
      files: request.files
    })
  })

  await fastify.listen({ port: 0 })

  t.teardown(fastify.close)

  return await fastify
}
