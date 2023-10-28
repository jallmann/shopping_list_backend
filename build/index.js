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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const redis_om_1 = require("redis-om");
const redis_db_1 = require("./lib/redis_db");
/* import { get_products } from './lib/handlers/get_products' */
/* import { get_product } from './lib/handlers/get_product' */
const fastify = (0, fastify_1.default)({
    logger: true,
});
// FIXME: All these should be moved to (a) fastify-plugin(s) to keep things tidy
fastify.get("/products", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const products = yield (0, redis_db_1.get_products)();
    process.env.DEBUG && console.log("Found products: ", products);
    return products.map((product) => {
        product.id = product[redis_om_1.EntityId];
        return product;
    });
}));
// FIXME: Move to plugin
fastify.get("/products/search", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const products = yield (0, redis_db_1.search_products)(request.query.name);
    process.env.DEBUG && console.log("Found products: ", products);
    return products.map((product) => {
        product.id = product[redis_om_1.EntityId];
        return product;
    });
}));
// FIXME: Move to plugin
fastify.get("/products/:product_id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const product = yield (0, redis_db_1.get_product)(request.params.product_id);
    if (!product.name) {
        reply.statusCode = 404;
        return;
    }
    product.id = product[redis_om_1.EntityId];
    process.env.DEBUG && console.log("Found product: ", product);
    return product;
}));
// FIXME: Move to plugin
fastify.post("/products", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    process.env.DEBUG &&
        console.log(`POST: Product ${request.body.name} costs ${request.body.price}`);
    const saveResult = yield (0, redis_db_1.save_product)(request.body);
    saveResult.id = saveResult[redis_om_1.EntityId];
    process.env.DEBUG && console.log(`Save result: ${saveResult}`);
    return saveResult;
}));
// FIXME: Move to plugin
fastify.delete("/products/:product_id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const product = yield (0, redis_db_1.get_product)(request.params.product_id);
    if (!product.name) {
        reply.statusCode = 404;
        return;
    }
    process.env.DEBUG &&
        console.log(`DELETE: product_id ${request.params.product_id}`);
    yield (0, redis_db_1.delete_product)(request.params.product_id);
    product.id = product[redis_om_1.EntityId];
    product.isDeleted = true;
    product.deletedOn = new Date().toISOString();
    process.env.DEBUG && console.log(`Deleted: ${product}`);
    return product;
}));
// FIXME: Move to plugin
fastify.get("/carts", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const carts = yield (0, redis_db_1.get_carts)();
    return carts.map(cart => {
        cart.id = cart[redis_om_1.EntityId];
        return cart;
    });
}));
// FIXME: Move to plugin
fastify.get("/carts/user/:user_id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const carts = yield (0, redis_db_1.get_carts_by_user)(request.params.user_id);
    return carts.map(cart => {
        cart.id = cart[redis_om_1.EntityId];
        return cart;
    });
}));
// FIXME: Move to plugin
fastify.delete("/carts/:cart_id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const cart = yield (0, redis_db_1.clear_cart)(request.params.cart_id);
    if (!cart) {
        reply.statusCode = 404;
        return;
    }
    return cart;
}));
// FIXME: Move to plugin
fastify.post("/carts", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const cart = (0, redis_db_1.add_cart)(request.body);
    return cart;
}));
// FIXME: Move to plugin
fastify.get("/users/:user_id/favourites", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const favourites = yield (0, redis_db_1.get_favourites)(request.params.user_id);
    return favourites;
}));
// FIXME: Move to plugin
fastify.post("/users/:user_id/favourites", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(request.params.user_id, request.body.product_id);
    const result = yield (0, redis_db_1.add_favourite)(request.params.user_id, request.body.product_id);
    return result;
}));
// FIXME: Move to plugin
fastify.delete("/users/:user_id/favourites/:product_id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, redis_db_1.remove_favourite)(request.params.user_id, request.params.product_id);
    return result;
}));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, redis_db_1.init_db)();
            process.env.DEBUG && (yield (0, redis_db_1.test_db)());
            yield fastify.listen({ port: 3000 });
        }
        catch (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    });
}
run();
