import * as fs from 'fs'
import { type AddressInfo } from 'net'
import * as path from 'path'
import t from 'tap'
import { createFastify } from './createFastify'
import { request } from './request'
import FormData = require('form-data')

const filePath = path.join(__dirname, '../package.json')

t.plan(1)
t.test('error', function (t) {
  t.plan(6)

  t.test('`addContentTypeParser` and `addHooks`', async function (t) {
    t.plan(2)

    try {
      await createFastify(t, { addHooks: true, addContentTypeParser: true })
      // should not get here
      t.fail()
    } catch (err: any) {
      t.ok(err)
      t.equal(err.message, 'Cannot enable `addContentTypeParser` togather with `addHooks`')
    }
  })

  t.test('fields', async function (t) {
    t.plan(1)

    const fastify = await createFastify(t, { busboy: { limits: { fields: 0 } } }, true)

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 500)
  })

  t.test('fieldSize', async function (t) {
    t.plan(1)

    const fastify = await createFastify(t, { busboy: { limits: { fieldSize: 0 } } }, true)

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 500)
  })

  t.test('files', async function (t) {
    t.plan(1)

    const fastify = await createFastify(t, { busboy: { limits: { files: 0 } } }, true)

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 500)
  })

  t.test('fileSize', async function (t) {
    t.plan(1)

    const fastify = await createFastify(t, { busboy: { limits: { fileSize: 0 } } }, true)

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 500)
  })

  t.test('fileSize - non-block stream', async function (t) {
    t.plan(1)

    const fastify = await createFastify(t, { busboy: { limits: { fileSize: 0 } } }, true)

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))
    // we test if any more file would block the stream
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 500)
  })
})
