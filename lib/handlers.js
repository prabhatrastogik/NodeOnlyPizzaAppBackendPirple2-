"use strict";

const _data = require("./data");
const helpers = require("./helpers");
const external = require("./external");
const respCd = helpers.constants;

const handlers = {};

const hash = helpers.hash;
const createTokenID = helpers.createTokenID;

handlers.unknown = async (data) => {
  console.log(data);
  return [respCd.HTTP_STATUS_NOT_FOUND, { Error: "Unknown path" }];
};

handlers.users = async (data) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    let result, user;
    try {
      if (data.method === "get") {
        user = { ...data.queryString, token: data.headers.token };
      } else user = { ...data.payloadReq, token: data.headers.token };
      result = await handlers._users[data.method](user);
      return result;
    } catch (e) {
      return [
        respCd.HTTP_INTERNAL_SERVER_ERROR,
        { Error: "unknown error " + e },
      ];
    }
  } else {
    return [
      respCd.HTTP_BAD_REQUEST,
      { Error: "Malformed request: Only GET, POST, PUT, DELETE accepted" },
    ];
  }
};

handlers._users = {};

handlers._users.post = async (user) => {
  const { name, email, address, password } = user;
  if (name && email && address && password) {
    try {
      userdata = await _data.read("users", email);
      if (userdata) {
        return [
          respCd.HTTP_BAD_REQUEST,
          { Error: "User with this email already exists" },
        ];
      } else {
        console.log("Unexpected: File read but no content - check code");
      }
    } catch (e) {
      try {
        const passwordSHA = hash(password);
        const newUser = { name, email, address, passwordSHA };
        console.log(newUser);
        await _data.create("users", email, newUser);
        return [respCd.HTTP_STATUS_CREATED, { Message: "User Created" }];
      } catch (e) {
        return [
          respCd.HTTP_INTERNAL_SERVER_ERROR,
          { Error: "Could not create user" + e },
        ];
      }
    }
  } else {
    return [respCd.HTTP_BAD_REQUEST, { Error: "Not all user data provided" }];
  }
};

handlers._users.get = async (user) => {
  const { email, token } = user;
  if (email && token) {
    try {
      const tokenIsValid = await handlers._tokens.validateToken(token, email);
      if (tokenIsValid) {
        const result = await _data.read("users", email);
        delete result.passwordSHA;
        return [200, { result }];
      } else {
        return [401, { Error: "User is not signed in" }];
      }
    } catch (e) {
      return [404, { Error: "Could not find user" + e }];
    }
  } else {
    return [400, { Error: "Not enough user data provided" }];
  }
};

handlers._users.put = async (user) => {
  const { name, email, address, password, token } = user;
  if (email && token) {
    try {
      const tokenIsValid = await handlers._tokens.validateToken(token, email);
      console.log(tokenIsValid);

      if (tokenIsValid) {
        const result = await _data.read("users", email);
        if (name) result.name = name;
        if (email) result.email = email;
        if (address) result.address = address;
        if (password) result.passwordSHA = hash(password);
        await _data.update("users", email, result);
        return [200, { Message: "User Updated" }];
      } else {
        return [
          respCd.HTTP_STATUS_UNAUTHORIZED,
          { Error: "User is not signed in" },
        ];
      }
    } catch (e) {
      return [
        respCd.HTTP_STATUS_NOT_FOUND,
        { Error: "Could not find user" + e },
      ];
    }
  } else {
    return [
      respCd.HTTP_BAD_REQUEST,
      { Error: "Not enough user data provided" },
    ];
  }
};

handlers._users.delete = async (user) => {
  const { email, token } = user;
  if (email && token) {
    try {
      const tokenIsValid = await handlers._tokens.validateToken(token, email);
      if (tokenIsValid) {
        await _data.delete("users", email);
        return [respCd.HTTP_STATUS_OK, { Message: "User Deleted" }];
      } else {
        return [
          respCd.HTTP_STATUS_UNAUTHORIZED,
          { Error: "User is not signed in" },
        ];
      }
    } catch (e) {
      return [respCd.HTTP_STATUS_NOT_FOUND, { Error: "Could not find user" }];
    }
  } else {
    return [
      respCd.HTTP_BAD_REQUEST,
      { Error: "Not enough user data provided" },
    ];
  }
};

handlers.tokens = async (data) => {
  const acceptableMethods = ["post", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    let result, user;
    try {
      if (data.method === "get") {
        user = { ...data.queryString, token: data.headers.token };
      } else user = { ...data.payloadReq, token: data.headers.token };
      result = await handlers._tokens[data.method](user);
      return result;
    } catch (e) {
      return [
        respCd.HTTP_INTERNAL_SERVER_ERROR,
        { Error: "unknown error " + e },
      ];
    }
  } else {
    return [
      respCd.HTTP_BAD_REQUEST,
      { Error: "Malformed request: Only POST, DELETE accepted" },
    ];
  }
};

handlers._tokens = {};

handlers._tokens.post = async (user) => {
  const { email, password } = user;
  if (email && password) {
    let userdata;
    try {
      userdata = await _data.read("users", email);
    } catch (e) {
      return [404, { Error: "User with email not registered" + e }];
    }
    // console.log(password, userdata.passwordSHA, hash(password));

    if (hash(password) === userdata.passwordSHA) {
      // console.log(email);
      const tokenID = createTokenID(email);
      console.log(tokenID);
      const expiry = Date.now() + 1000 * 60 * 60 * 24 * 365;
      const tokenObj = { token: tokenID, email, expiry };
      // console.log(tokenObj);
      try {
        await _data.create("tokens", tokenID, tokenObj);
        return [respCd.HTTP_STATUS_OK, { tokenObj }];
      } catch (e) {
        return [
          respCd.HTTP_INTERNAL_SERVER_ERROR,
          { Error: "Authentication could not be created" + e },
        ];
      }
    } else {
      return [respCd.HTTP_STATUS_UNAUTHORIZED, { Error: "Incorrect Password" }];
    }
  } else {
    return [
      respCd.HTTP_BAD_REQUEST,
      { Error: "Not enough user data provided" },
    ];
  }
};

handlers._tokens.delete = async (user) => {
  const { email, token } = user;
  if (email && token) {
    try {
      console.log(email, token);
      const userdata = await _data.read("users", email);
      const tokenObj = await _data.read("tokens", token);
      if (userdata && tokenObj && userdata.email === tokenObj.email) {
        await _data.delete("tokens", token);
        return [respCd.HTTP_STATUS_OK, { Message: "Logged Out" }];
      } else {
        return [
          respCd.HTTP_STATUS_UNAUTHORIZED,
          { Error: "Token and authenticatio dont match" },
        ];
      }
    } catch (e) {
      return [
        respCd.HTTP_STATUS_UNAUTHORIZED,
        { Error: "User with email not logget in" + e },
      ];
    }
  } else {
    return [
      respCd.HTTP_BAD_REQUEST,
      { Error: "Enough user data not provided" },
    ];
  }
};

handlers._tokens.validateToken = async (token, email) => {
  let tokenObj;
  try {
    tokenObj = await _data.read("tokens", token);
    if (tokenObj.email === email && tokenObj.expiry > Date.now()) {
      return true;
    } else {
      return false;
    }
  } catch (e) {
    console.log("Cant read tokenObj" + e);
    return false;
  }
};

handlers.menu = async (data) => {
  const token = data.headers.token;
  const { email } = data.queryString;
  try {
    if (data.method === "get") {
      console.log(token, email, data.queryString);

      const tokenIsValid = await handlers._tokens.validateToken(token, email);

      if (tokenIsValid) {
        const menuItems = await _data.read("menu", "items");
        return [respCd.HTTP_STATUS_OK, menuItems];
      } else {
        return [
          respCd.HTTP_STATUS_UNAUTHORIZED,
          { Error: "User is not signed in" },
        ];
      }
    } else {
      return [
        respCd.HTTP_BAD_REQUEST,
        { Error: "Malformed request: Only GET accepted" },
      ];
    }
  } catch (e) {
    return [
      respCd.HTTP_INTERNAL_SERVER_ERROR,
      { Error: "Menu Retrieval Error" + e },
    ];
  }
};

handlers.cart = async (data) => {
  const acceptableMethods = ["get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    let result, cartReq;
    try {
      if (data.method === "get") {
        cartReq = { ...data.queryString, token: data.headers.token };
      } else cartReq = { ...data.payloadReq, token: data.headers.token };
      result = await handlers._cart[data.method](cartReq);
      return result;
    } catch (e) {
      return [
        respCd.HTTP_INTERNAL_SERVER_ERROR,
        { Error: "Unknown error " + e },
      ];
    }
  } else {
    return [
      respCd.HTTP_BAD_REQUEST,
      { Error: "Malformed request: Only GET, PUT, DELETE accepted" },
    ];
  }
};

handlers._cart = {};

handlers._cart.put = async (cartReq) => {
  const { email, token, cartList, refresh } = cartReq;
  if (token && cartList && email) {
    const tokenIsValid = await handlers._tokens.validateToken(token, email);
    if (tokenIsValid) {
      try {
        const cartdata = await _data.read("carts", email);
        await _data.delete("carts", email);
        if (cartdata && !refresh) {
          cartList.push(...cartdata.cartList);
        }
      } finally {
        await _data.create("carts", email, { email, cartList });
        return [respCd.HTTP_STATUS_OK, { Message: "Cart Created" }];
      }
    }
  } else {
    return [
      respCd.HTTP_BAD_REQUEST,
      { Error: "Not all user/cart data provided" },
    ];
  }
};

handlers._cart.get = async (cartReq) => {
  const { email, token } = cartReq;
  if (token && email) {
    const tokenIsValid = await handlers._tokens.validateToken(token, email);
    if (tokenIsValid) {
      try {
        const cartdata = await _data.read("carts", email);
        return [200, cartdata];
      } catch (e) {
        return [
          respCd.HTTP_STATUS_NOT_FOUND,
          { Error: "Nothing in cart for user" },
        ];
      }
    } else {
      return [respCd.HTTP_STATUS_UNAUTHORIZED, { Error: "User not logged in" }];
    }
  } else {
    return [
      respCd.HTTP_BAD_REQUEST,
      { Error: "Not all user/authentication data provided" },
    ];
  }
};

handlers._cart.delete = async (cartReq) => {
  const { email, token } = cartReq;
  if (token && email) {
    const tokenIsValid = await handlers._tokens.validateToken(token, email);
    if (tokenIsValid) {
      try {
        const cartdata = await _data.read("carts", email);
        if (cartdata) {
          await _data.delete("carts", email);
        }
        return [
          respCd.HTTP_STATUS_OK,
          { M4essage: "Cart data has been deleted" },
        ];
      } catch (e) {
        return [
          respCd.HTTP_STATUS_NOT_FOUND,
          { Error: "Nothing in cart for user" },
        ];
      }
    }
  } else {
    return [
      respCd.HTTP_BAD_REQUEST,
      { Error: "Not all user/authentication data provided" },
    ];
  }
};

handlers.order = async (data) => {
  const { email, paymentToken } = data.payloadReq;
  const token = data.headers.token;

  if (email && paymentToken) {
    const tokenIsValid = await handlers._tokens.validateToken(token, email);
    if (tokenIsValid) {
      try {
        const cartdata = await _data.read("carts", email);
        const menu = await _data.read("menu", "items");

        const amount = cartdata.cartList.reduce(
          (acc, item) => acc + menu[item].price
        );
        const orderID = email + String(Date.now());
        const description = "This is for order : " + orderID;

        const stripeResponse = await external.stripePayment(
          orderID,
          amount,
          description,
          paymentToken
        );

        console.log(stripeResponse.status);
        const mailResp = await external.mailgunMail(
          email,
          `Your order ${orderID} is placed`,
          "${OrderId} ${amount}"
        );
        console.log(mailResp);
        await _data.delete("carts", email);

        return [respCd.HTTP_STATUS_OK, { Message: "Order Placed" }];
      } catch (e) {
        return [respCd.HTTP_STATUS_NOT_FOUND, { Error: e }];
      }
    } else {
      return [respCd.HTTP_STATUS_UNAUTHORIZED, { Error: "User not logged in" }];
    }
  } else {
    return [
      respCd.HTTP_BAD_REQUEST,
      { Error: "Not all user/authentication data provided" },
    ];
  }
};

module.exports = handlers;
