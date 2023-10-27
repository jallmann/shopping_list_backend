'use strict'

import { FastifyRequest, FastifyReply } from 'fastify'

export async function get_products(request: FastifyRequest, reply: FastifyReply) {
  return { hello: 'world' }
}
