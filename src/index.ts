"use strict"

import Fastify from "fastify"
import { EntityId } from "redis-om"
import {
  get_product,
  get_products,
  delete_product,
  init_db,
  save_product,
  test_db,
  search_products,
  clear_cart,
  get_favourites,
  add_favourite,
  remove_favourite,
  get_carts,
  get_carts_by_user,
  add_cart
} from "./lib/redis_db"
import {
  ISearchQuery,
  IGetProductParams,
  IDeleteCartParams,
  IDeleteProductParams,
  Product,
  Cart,
  IGetFavouritesParams,
  IPostFavouriteParams,
  IPostFavouriteBody,
  IDeleteFavouriteParams,
  IGetCartsParams,
} from "./lib/models"
/* import { get_products } from './lib/handlers/get_products' */
/* import { get_product } from './lib/handlers/get_product' */

const fastify = Fastify({
  logger: true,
})

// FIXME: All these should be moved to (a) fastify-plugin(s) to keep things tidy
fastify.get("/products", async (request, reply) => {
  const products = await get_products()
  process.env.DEBUG && console.log("Found products: ", products)
  return products.map((product) => {
    product.id = product[EntityId]
    return product
  })
})

// FIXME: Move to plugin
fastify.get<{ Querystring: ISearchQuery }>(
  "/products/search",
  async (request, reply) => {
    const products = await search_products(request.query.name)
    process.env.DEBUG && console.log("Found products: ", products)
    return products.map((product) => {
      product.id = product[EntityId]
      return product
    })
  }
)

// FIXME: Move to plugin
fastify.get<{ Params: IGetProductParams }>(
  "/products/:product_id",
  async (request, reply) => {
    const product = await get_product(request.params.product_id)
    if (!product.name) {
      reply.statusCode = 404
      return
    }
    product.id = product[EntityId]
    process.env.DEBUG && console.log("Found product: ", product)
    return product
  }
)

// FIXME: Move to plugin
fastify.post<{ Body: Product }>("/products", async (request, reply) => {
  process.env.DEBUG &&
    console.log(
      `POST: Product ${request.body.name} costs ${request.body.price}`
    )
  const saveResult = await save_product(request.body)
  saveResult.id = saveResult[EntityId]
  process.env.DEBUG && console.log(`Save result: ${saveResult}`)
  return saveResult
})

// FIXME: Move to plugin
fastify.delete<{ Params: IDeleteProductParams }>(
  "/products/:product_id",
  async (request, reply) => {
    const product = await get_product(request.params.product_id)
    if (!product.name) {
      reply.statusCode = 404
      return
    }
    process.env.DEBUG &&
      console.log(`DELETE: product_id ${request.params.product_id}`)
    await delete_product(request.params.product_id)
    product.id = product[EntityId]
    product.isDeleted = true
    product.deletedOn = new Date().toISOString()
    process.env.DEBUG && console.log(`Deleted: ${product}`)
    return product
  }
)

// FIXME: Move to plugin
fastify.get(
  "/carts",
  async (request, reply) => {
    const carts = await get_carts()
    return carts.map(cart => {
      cart.id = cart[EntityId]
      return cart
    })
  }
)

// FIXME: Move to plugin
fastify.get<{ Params: IGetCartsParams }>(
  "/carts/user/:user_id",
  async (request, reply) => {
    const carts = await get_carts_by_user(request.params.user_id)
    return carts.map(cart => {
      cart.id = cart[EntityId]
      return cart
    })
  }
)

// FIXME: Move to plugin
fastify.delete<{ Params: IDeleteCartParams }>(
  "/carts/:cart_id",
  async (request, reply) => {
    const cart = await clear_cart(request.params.cart_id)
    if (!cart) {
      reply.statusCode = 404
      return
    }
    return cart
  }
)

// FIXME: Move to plugin
fastify.post<{ Body: Cart }>("/carts", async (request, reply) => {
  const cart = add_cart(request.body)
  return cart
})

// FIXME: Move to plugin
fastify.get<{ Params: IGetFavouritesParams }>(
  "/users/:user_id/favourites",
  async (request, reply) => {
    const favourites = await get_favourites(request.params.user_id)
    return favourites
  }
)

// FIXME: Move to plugin
fastify.post<{ Params: IPostFavouriteParams; Body: IPostFavouriteBody }>(
  "/users/:user_id/favourites",
  async (request, reply) => {
    const result = await add_favourite(
      request.params.user_id,
      request.body.product_id
    )
    return result
  }
)

// FIXME: Move to plugin
fastify.delete<{ Params: IDeleteFavouriteParams }>(
  "/users/:user_id/favourites/:product_id",
  async (request, reply) => {
    const result = await remove_favourite(
      request.params.user_id,
      request.params.product_id
    )
    return result
  }
)

async function run() {
  try {
    await init_db()
    process.env.DEBUG && (await test_db())

    await fastify.listen({ port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

run()
