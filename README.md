# fastify-busboy

[![Continuous Integration](https://github.com/climba03003/fastify-busboy/actions/workflows/ci.yml/badge.svg)](https://github.com/climba03003/fastify-busboy/actions/workflows/ci.yml)
[![Package Manager CI](https://github.com/climba03003/fastify-busboy/actions/workflows/package-manager-ci.yml/badge.svg)](https://github.com/climba03003/fastify-busboy/actions/workflows/package-manager-ci.yml)
[![NPM version](https://img.shields.io/npm/v/fastify-busboy.svg?style=flat)](https://www.npmjs.com/package/fastify-busboy)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/climba03003/fastify-busboy)](https://github.com/climba03003/fastify-busboy)
[![GitHub](https://img.shields.io/github/license/climba03003/fastify-busboy)](https://github.com/climba03003/fastify-busboy)

This plugin add a handy parser for `multipart/form-data` by using `busboy` and provide a better integration between `multipart/form-data` and `fastify-swagger`

You can checkout `fastify-formidable` if you prefer using `formidable`. Or `@fastify/multipart` if you prefer offcial plugin.

## Install

```bash
npm install fastify-busboy --save

yarn add fastify-busboy
```

## Usage

```ts
import FastifyBusboy, { kFileSavedPaths, kIsMultipart, kIsMultipartParsed } from 'fastify-busboy'

fastify.register(FastifyBusboy)

fastify.post('/', async function(request, reply) {
  // you need to call the parser if you do not pass any option through plugin registration
  await request.parseMultipart()

  // access files
  request.files

  // access body
  // note that file fields will exist in body and it will becomes the file path saved on disk
  request.body

  // access all the files path
  request[kFileSavedPaths]

  // check if it is multipart
  if( request[kIsMultipart] === true ) {}

  // check if it is already parsed
  if ( request[kIsMultipartParsed] === true ) {}
})

// add content type parser which will automatic parse all `multipart/form-data` found
fastify.register(FastifyBusboy, {
  addContentTypeParser: true
})

// add `preValidation` hook which will automatic parse all `multipart/form-data` found
fastify.register(FastifyBusboy, {
  addHooks: true
})
```

### Options

#### options.busboy

The options which will be directly passed to `busboy`.

```ts
import FastifyBusboy from 'fastify-busboy'

fastify.register(FastifyBusboy, {
  busboy: {
    limits: {
      fileSize: 1000
    },
  },
  // this folder will be automatic created by this plugin
  uploadDir: '/'
})
```

See: [`busboy`](https://github.com/mscdex/busboy/tree/master#exports)

#### options.removeFilesFromBody

This options will not add any files fields to body when enabled.

```ts
import FastifyBusboy from 'fastify-busboy'

fastify.register(FastifyBusboy, {
  removeFilesFromBody: true
})
```

### Error Handling

You can handle the error from either `setErrorHandler` or using `try-catch` with `request.parseMultipart()`

```ts
import FastifyBusboy from 'fastify-busboy'

fastify.register(FastifyBusboy)

fastify.post('/', async function(request, reply) {
  try {
    // you need to call the parser if you do not pass any option through plugin registration
    await request.parseMultipart()
  } catch (err) {
    switch(err.code) {
      case 'FST_BB_FIELD_SIZE_LIMIT': {
        // field size limit reached
        break
      }
      case 'FST_BB_FIELDS_LIMIT': {
        // fields limit reached
        break
      }
      case 'FST_BB_FILE_SIZE_LIMIT': {
        // file size limit reached
        break
      }
      case 'FST_BB_FILES_LIMIT': {
        // files limit reached
        break
      }
      case 'FST_BB_PARTS_LIMIT': {
        // parts limit reached
        break
      }
      default: {
        // unknown error
        // maybe write stream error
      }
    }
  }
})

fastify.setErrorHandler(function(err) {
  switch(err.code) {
    case 'FST_BB_FIELD_SIZE_LIMIT': {
      // field size limit reached
      break
    }
    case 'FST_BB_FIELDS_LIMIT': {
      // fields limit reached
      break
    }
    case 'FST_BB_FILE_SIZE_LIMIT': {
      // file size limit reached
      break
    }
    case 'FST_BB_FILES_LIMIT': {
      // files limit reached
      break
    }
    case 'FST_BB_PARTS_LIMIT': {
      // parts limit reached
      break
    }
    default: {
      // unknown error
      // maybe write stream error
    }
  }
})
```

### Integration

It is a known limitation for `fastify-multipart` integrate with `fastify-swagger` and this plugin provide a relatively simple solution for the integration.

```ts
import Fastify from 'fastify'
import FastifyBusboy, { ajvBinaryFormat } from 'fastify-busboy'
import FastifySwagger from 'fastify-swagger'

const fastify = Fastify({
  ajv: {
    plugins: [ ajvBinaryFormat ]
  }
})

fastify.register(FastifyBusboy, {
  addContentTypeParser: true
})

fastify.register(FastifySwagger)
```
