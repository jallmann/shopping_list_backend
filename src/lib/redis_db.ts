"use strict"

/**
 * A simple object mapping database interface to redis.
 * Expects a running redis-stack-server under localhost:6379
 */
import { createClient } from "redis"
import { randomUUID } from "crypto"
import { Repository, Schema, EntityId, Entity } from "redis-om"
import { Cart, Product, User } from "./models"

const productSchema = new Schema("product", {
  id: { type: "string", field: "product_id" },
  name: { type: "text", field: "product_name" },
  price: { type: "number", field: "product_price" },
})

const userSchema = new Schema("user", {
  id: { type: "string", field: "user_id" },
  favourites: { type: "string[]" },
})

const cartSchema = new Schema("cart", {
  id: { type: "string", field: "cart_id" },
  products: { type: "string[]", field: "cart_products" },
  user_id: { type: "string", field: "cart_user_id" },
})

// We ensure these are initialized by calling init_db
let productRepository: Repository | undefined
let userRepository: Repository | undefined
let cartRepository: Repository | undefined

/**
 * MUST be called before using the DB interface.
 */
export async function init_db() {
  const redis = createClient()
  redis.on("error", (err) => console.log("Redis Client Error", err))
  await redis.connect()
  console.log(`Pinging redis. Answer: ${await redis.ping()}`)
  productRepository = new Repository(productSchema, redis)
  userRepository = new Repository(userSchema, redis)
  cartRepository = new Repository(cartSchema, redis)
  await productRepository.createIndex()
  await userRepository.createIndex()
  await cartRepository.createIndex()

  process.env.DB_REINIT && (await flush_and_refill_db())
}

/**
 * Used to put some initial data into the db.
 */
async function flush_and_refill_db() {
  const oldProducts = await productRepository!.search().return.all()
  await Promise.all(oldProducts.map(async product => (
    await productRepository!.remove(product[EntityId] || '')
  )))
  const oldCarts = await cartRepository!.search().return.all()
  await Promise.all(oldCarts.map(async cart => (
    await cartRepository!.remove(cart[EntityId] || '')
  )))
  const oldUsers = await userRepository!.search().return.all()
  await Promise.all(oldUsers.map(async user => (
    await userRepository!.remove(user[EntityId] || '')
  )))

  const products: Product[] = require("../../db_init_data/products.json")
  const users: User[] = require("../../db_init_data/users.json")
  await Promise.all(
    products.map(async (product) => {
      await productRepository!.save(product)
    })
  )
  await Promise.all(
    users.map(async (user) => {
      await userRepository!.save(user)
    })
  )
}

/**
 * Get a single product from the database by id.
 * @param id string entity_id of the product.
 * @returns The requested product. An otherwise empty product with the requested id if it does not exist. (redis-om works that way.)
 */
export async function get_product(id: string) {
  return productRepository!.fetch(id)
}

/**
 * Get all products currently in the database.
 * @returns Array of all products. Possibly empty.
 */
export async function get_products() {
  return productRepository!.search().return.all()
}

/**
 * Search the products db by product name
 * @param name
 * @returns Array of all products filtered by name. Possibly empty.
 */
export async function search_products(name: string) {
  return productRepository!
    .search()
    .where("name")
    .matches(`*${name}*`)
    .return.all()
}

/**
 * Insert a product into the DB
 * @param product
 * @returns The inserted product.
 */
export async function save_product(product: Product) {
  return productRepository!.save(product)
}

/**
 * Delete a product by its product_id.
 * @param id
 * @returns The deleted product ?? FIXME
 */
export async function delete_product(id: string) {
  return productRepository!.remove(id)
}

/**
 * Get a user's shopping cart by its user_id.
 * @param user_id ID of the user we want to retrieve the shopping cart from.
 * @returns The users shopping cart. Possibly empty, if the user does not exists or it is indeed empty.
 */
export async function get_carts_by_user(user_id: string) {
  const carts = await cartRepository!
    .search()
    .where("user_id")
    .equals(user_id)
    .return.all()
  return carts
}

/**
 * Get all shopping carts.
 * @returns The users shopping cart. Possibly empty, if the user does not exists or it is indeed empty.
 */
export async function get_carts() {
  const carts = await cartRepository!.search().return.all()
  return carts
}

/**
 * Clear a user's shopping cart referenced by the user_id.
 * @param user_id User_id of the cart to clear
 * @returns An empty array.
 */
export async function clear_cart(cart_id: string) {
  const cart = await cartRepository!.fetch(cart_id)
  if (!cart) {
    return null // FIXME
  }
  // FIXME: a constructor for an empty cart would be nice.
  cart.products = []
  await cartRepository!.save(cart)
  return cart
}

/**
 * Add a new cart to a given user.
 * @param user_id
 * @param cart_content
 * @returns
 */
export async function add_cart(cart: Cart) {
  const user = await userRepository!
    .search()
    .where("id")
    .equals(cart.user_id)
    .return.first()
  if (!user) {
    return null
  }
  // FIXME: Sanity check. Do the product id's exist?
  const newCart = await cartRepository!.save({
    user_id: cart.user_id,
    // We need to bundle product_ids and quantities in a single string because our DB is limited.
    products: cart.products.map((product) => {
      return `${product.id}:${product.quantity}`
    }),
  })
  return newCart
}

export async function get_favourites(user_id: string) {
  const user = await userRepository!
    .search()
    .where("id")
    .equals(user_id)
    .return.first()
  if (!user) {
    return []
  }
  return (user as User).favourites
}

export async function add_favourite(user_id: string, product_id: string) {
  const user = await userRepository!
    .search()
    .where("id")
    .equals(user_id)
    .return.first()
  if (!user) {
    return []
  }
  // FIXME: Sanity check. Does the product id exist?
  if ((user as User).favourites.includes(product_id)) {
    return user.favourites
  }
  ;(user as User).favourites.push(product_id)
  await userRepository!.save(user)
  return user.favourites
}

export async function remove_favourite(user_id: string, product_id: string) {
  const user = await userRepository!
    .search()
    .where("id")
    .equals(user_id)
    .return.first()
  if (!user) {
    return []
  }
  // FIXME: Sanity check. Does the product id exist?
  user.favourites = (user as User).favourites.filter(
    (p_id) => p_id !== product_id
  )
  await userRepository!.save(user)
  return user.favourites
}

/**
 * Get a user by its user_id.
 * @param user_id ID of the user
 * @returns The user. An otherwise empty user with the requested id if it does not exist. (redis-om works that way.)
 */
export async function get_user(user_id: string) {
  const user = await userRepository!
    .search()
    .where("id")
    .equals(user_id)
    .return.first()
  if (!user) {
    return []
  }
  return user.cart
}

/**
 * Tests redis db connection by saving a product, retrieving it by name and deleting it again.
 */
export async function test_db() {
  const product = await productRepository!.save({
    name: "someName",
    price: 12345,
  })

  console.log(await productRepository!.fetch(product![EntityId] || ""))

  console.log(await productRepository!.fetch(randomUUID()))

  console.log(
    await userRepository!
      .search()
      .where("id")
      .equals("something")
      .return.first()
  )

  console.log(await userRepository!.search().return.first())

  const products = await productRepository!
    .search()
    .where("name")
    .match("*some*")
    .return.all()
  console.log(products)
  await Promise.all(
    products?.map(async (product) => {
      return productRepository!.remove(product![EntityId] || "")
    })
  )
}
