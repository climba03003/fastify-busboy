import * as fs from 'fs'
import { type AddressInfo } from 'net'
import * as path from 'path'
import t from 'tap'
import { createFastify } from './createFastify'
import { request } from './request'
import FormData = require('form-data')

const filePath = path.join(__dirname, '../package.json')

t.plan(1)
t.test('addContentTypeParser', function (t) {
  t.plan(3)

  t.test('single file', async function (t) {
    t.plan(5)

    const fastify = await createFastify(t, { addContentTypeParser: true })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)
    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(json.body.file), true)
    t.ok(json.files.file)
    t.equal(json.files.file.filename, 'package.json')
  })

  t.test('multiple fields', async function (t) {
    t.plan(4)

    const fastify = await createFastify(t, { addContentTypeParser: true })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('foo', 'baz')
    form.append('foo', 'hello')
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 200)

    const json = await response.json()

    t.same(json.body.foo, ['bar', 'baz', 'hello'])
    t.ok(json.files.file)
    t.equal(json.files.file.filename, 'package.json')
  })

  t.test('multiple files', async function (t) {
    t.plan(7)

    const fastify = await createFastify(t, { addContentTypeParser: true, busboy: {} })

    const form = new FormData()
    form.append('foo', 'bar')
    form.append('file', fs.createReadStream(filePath))
    form.append('file', fs.createReadStream(filePath))
    form.append('file', fs.createReadStream(filePath))

    const response = await request(`http://localhost:${(fastify.server.address() as AddressInfo).port}`, form)

    t.equal(response.status, 200)

    const json = await response.json()

    t.equal(json.body.foo, 'bar')
    t.equal(Array.isArray(json.body.file), true)
    t.ok(json.files.file)
    t.equal(json.files.file[0].filename, 'package.json')
    t.equal(json.files.file[1].filename, 'package.json')
    t.equal(json.files.file[2].filename, 'package.json')
  })
})
