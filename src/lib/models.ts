"use strict";

export interface ISearchQuery {
  name: string;
}

export interface IGetProductParams {
  product_id: string;
}

export interface IGetCartsParams {
  user_id: string;
}

export interface IDeleteCartParams {
  cart_id: string;
}

export interface IDeleteProductParams {
  product_id: string;
}

export interface IGetFavouritesParams {
  user_id: string;
}

export interface IPostFavouriteParams {
  user_id: string;
}

export interface IPostFavouriteBody {
  product_id: string;
}

export interface IDeleteFavouriteParams {
  user_id: string;
  product_id: string;
}

export type Product = {
  id: string;
  name: string;
  price: number;
  discount: number;
  quantity: number;
};

export type User = {
  id: string;
  cart_id: string;
  favourites: string[];
};

export type Cart = {
  id: string;
  user_id: string;
  products: Product[];
};
