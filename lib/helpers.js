const crypto = require("crypto");

const helpers = {};

helpers.constants = Object.freeze({
  HTTP_STATUS_OK: 200,
  HTTP_STATUS_CREATED: 201,
  HTTP_BAD_REQUEST: 400,
  HTTP_STATUS_UNAUTHORIZED: 403,
  HTTP_STATUS_NOT_FOUND: 404,
  HTTP_INTERNAL_SERVER_ERROR: 500,
});

helpers.hash = (str) => {
  if (typeof str == "string" && str.length > 0) {
    var hash = crypto
      .createHmac("sha256", "config.hashingSecret")
      .update(str)
      .digest("hex");
    return hash;
  } else {
    return false;
  }
};

helpers.createTokenID = (email) => {
  const allChars =
    "abcdefghijklmnopqustuvwxyzABCDEFGHIJKLMNOPQUSTUVWXYJ123456789";
  const emailLength = email.length;
  const TOKEN_LENGHT = 20;
  let tokenID;
  if (emailLength > 10) {
    tokenID = email.slice(0, 10);
    additionalLength = 10;
  } else {
    tokenID = email;
    additionalLength = 20 - emailLength;
  }
  for (let i = 0; i < additionalLength; i++) {
    tokenID += allChars[Math.floor(allChars.length * Math.random())];
  }
  return tokenID;
};

module.exports = helpers;
