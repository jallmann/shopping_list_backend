"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.test_db = exports.get_user = exports.remove_favourite = exports.add_favourite = exports.get_favourites = exports.add_cart = exports.clear_cart = exports.get_carts = exports.get_carts_by_user = exports.delete_product = exports.save_product = exports.search_products = exports.get_products = exports.get_product = exports.init_db = void 0;
/**
 * A simple object mapping database interface to redis.
 * Expects a running redis-stack-server under localhost:6379
 */
const redis_1 = require("redis");
const crypto_1 = require("crypto");
const redis_om_1 = require("redis-om");
const productSchema = new redis_om_1.Schema("product", {
    id: { type: "string", field: "product_id" },
    name: { type: "text", field: "product_name" },
    price: { type: "number", field: "product_price" },
});
const userSchema = new redis_om_1.Schema("user", {
    id: { type: "string", field: "user_id" },
    favourites: { type: "string[]" },
});
const cartSchema = new redis_om_1.Schema("cart", {
    id: { type: "string", field: "cart_id" },
    products: { type: "string[]", field: "cart_products" },
    user_id: { type: "string", field: "cart_user_id" },
});
// We ensure these are initialized by calling init_db
let productRepository;
let userRepository;
let cartRepository;
/**
 * MUST be called before using the DB interface.
 */
function init_db() {
    return __awaiter(this, void 0, void 0, function* () {
        const redis = (0, redis_1.createClient)();
        redis.on("error", (err) => console.log("Redis Client Error", err));
        yield redis.connect();
        console.log(`Pinging redis. Answer: ${yield redis.ping()}`);
        productRepository = new redis_om_1.Repository(productSchema, redis);
        userRepository = new redis_om_1.Repository(userSchema, redis);
        cartRepository = new redis_om_1.Repository(cartSchema, redis);
        yield productRepository.createIndex();
        yield userRepository.createIndex();
        yield cartRepository.createIndex();
        process.env.DB_REINIT && (yield flush_and_refill_db());
    });
}
exports.init_db = init_db;
/**
 * Used to put some initial data into the db.
 */
function flush_and_refill_db() {
    return __awaiter(this, void 0, void 0, function* () {
        const oldProducts = yield productRepository.search().return.all();
        yield Promise.all(oldProducts.map((product) => __awaiter(this, void 0, void 0, function* () {
            return (yield productRepository.remove(product[redis_om_1.EntityId] || ''));
        })));
        const oldCarts = yield cartRepository.search().return.all();
        yield Promise.all(oldCarts.map((cart) => __awaiter(this, void 0, void 0, function* () {
            return (yield cartRepository.remove(cart[redis_om_1.EntityId] || ''));
        })));
        const oldUsers = yield userRepository.search().return.all();
        yield Promise.all(oldUsers.map((user) => __awaiter(this, void 0, void 0, function* () {
            return (yield userRepository.remove(user[redis_om_1.EntityId] || ''));
        })));
        const products = require("../../db_init_data/products.json");
        const users = require("../../db_init_data/users.json");
        yield Promise.all(products.map((product) => __awaiter(this, void 0, void 0, function* () {
            yield productRepository.save(product);
        })));
        yield Promise.all(users.map((user) => __awaiter(this, void 0, void 0, function* () {
            yield userRepository.save(user);
        })));
    });
}
/**
 * Get a single product from the database by id.
 * @param id string entity_id of the product.
 * @returns The requested product. An otherwise empty product with the requested id if it does not exist. (redis-om works that way.)
 */
function get_product(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return productRepository.fetch(id);
    });
}
exports.get_product = get_product;
/**
 * Get all products currently in the database.
 * @returns Array of all products. Possibly empty.
 */
function get_products() {
    return __awaiter(this, void 0, void 0, function* () {
        return productRepository.search().return.all();
    });
}
exports.get_products = get_products;
/**
 * Search the products db by product name
 * @param name
 * @returns Array of all products filtered by name. Possibly empty.
 */
function search_products(name) {
    return __awaiter(this, void 0, void 0, function* () {
        return productRepository
            .search()
            .where("name")
            .matches(`*${name}*`)
            .return.all();
    });
}
exports.search_products = search_products;
/**
 * Insert a product into the DB
 * @param product
 * @returns The inserted product.
 */
function save_product(product) {
    return __awaiter(this, void 0, void 0, function* () {
        return productRepository.save(product);
    });
}
exports.save_product = save_product;
/**
 * Delete a product by its product_id.
 * @param id
 * @returns The deleted product ?? FIXME
 */
function delete_product(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return productRepository.remove(id);
    });
}
exports.delete_product = delete_product;
/**
 * Get a user's shopping cart by its user_id.
 * @param user_id ID of the user we want to retrieve the shopping cart from.
 * @returns The users shopping cart. Possibly empty, if the user does not exists or it is indeed empty.
 */
function get_carts_by_user(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const carts = yield cartRepository
            .search()
            .where("user_id")
            .equals(user_id)
            .return.all();
        return carts;
    });
}
exports.get_carts_by_user = get_carts_by_user;
/**
 * Get all shopping carts.
 * @returns The users shopping cart. Possibly empty, if the user does not exists or it is indeed empty.
 */
function get_carts() {
    return __awaiter(this, void 0, void 0, function* () {
        const carts = yield cartRepository.search().return.all();
        return carts;
    });
}
exports.get_carts = get_carts;
/**
 * Clear a user's shopping cart referenced by the user_id.
 * @param user_id User_id of the cart to clear
 * @returns An empty array.
 */
function clear_cart(cart_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const cart = yield cartRepository.fetch(cart_id);
        if (!cart) {
            return null; // FIXME
        }
        // FIXME: a constructor for an empty cart would be nice.
        cart.products = [];
        yield cartRepository.save(cart);
        return cart;
    });
}
exports.clear_cart = clear_cart;
/**
 * Add a new cart to a given user.
 * @param user_id
 * @param cart_content
 * @returns
 */
function add_cart(cart) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield userRepository
            .search()
            .where("id")
            .equals(cart.user_id)
            .return.first();
        if (!user) {
            return null;
        }
        // FIXME: Sanity check. Do the product id's exist?
        const newCart = yield cartRepository.save({
            user_id: cart.user_id,
            // We need to bundle product_ids and quantities in a single string because our DB is limited.
            products: cart.products.map((product) => {
                return `${product.id}:${product.quantity}`;
            }),
        });
        return newCart;
    });
}
exports.add_cart = add_cart;
function get_favourites(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield userRepository
            .search()
            .where("id")
            .equals(user_id)
            .return.first();
        if (!user) {
            return [];
        }
        return user.favourites;
    });
}
exports.get_favourites = get_favourites;
function add_favourite(user_id, product_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield userRepository
            .search()
            .where("id")
            .equals(user_id)
            .return.first();
        if (!user) {
            return [];
        }
        // FIXME: Sanity check. Does the product id exist?
        if (user.favourites.includes(product_id)) {
            return user.favourites;
        }
        ;
        user.favourites.push(product_id);
        yield userRepository.save(user);
        return user.favourites;
    });
}
exports.add_favourite = add_favourite;
function remove_favourite(user_id, product_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield userRepository
            .search()
            .where("id")
            .equals(user_id)
            .return.first();
        if (!user) {
            return [];
        }
        // FIXME: Sanity check. Does the product id exist?
        user.favourites = user.favourites.filter((p_id) => p_id !== product_id);
        yield userRepository.save(user);
        return user.favourites;
    });
}
exports.remove_favourite = remove_favourite;
/**
 * Get a user by its user_id.
 * @param user_id ID of the user
 * @returns The user. An otherwise empty user with the requested id if it does not exist. (redis-om works that way.)
 */
function get_user(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield userRepository
            .search()
            .where("id")
            .equals(user_id)
            .return.first();
        if (!user) {
            return [];
        }
        return user.cart;
    });
}
exports.get_user = get_user;
/**
 * Tests redis db connection by saving a product, retrieving it by name and deleting it again.
 */
function test_db() {
    return __awaiter(this, void 0, void 0, function* () {
        const product = yield productRepository.save({
            name: "someName",
            price: 12345,
        });
        console.log(yield productRepository.fetch(product[redis_om_1.EntityId] || ""));
        console.log(yield productRepository.fetch((0, crypto_1.randomUUID)()));
        console.log(yield userRepository
            .search()
            .where("id")
            .equals("something")
            .return.first());
        console.log(yield userRepository.search().return.first());
        const products = yield productRepository
            .search()
            .where("name")
            .match("*some*")
            .return.all();
        console.log(products);
        yield Promise.all(products === null || products === void 0 ? void 0 : products.map((product) => __awaiter(this, void 0, void 0, function* () {
            return productRepository.remove(product[redis_om_1.EntityId] || "");
        })));
    });
}
exports.test_db = test_db;
