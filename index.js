const http = require("http");
const url = require("url");
const { StringDecoder } = require("string_decoder");

const handlers = require("./lib/handlers");

const route = {
  unknown: handlers.unknown,
  users: handlers.users,
  tokens: handlers.tokens,
  menu: handlers.menu,
  cart: handlers.cart,
  order: handlers.order,
};

const server = http.createServer((req, res) => {
  const parsedURL = url.parse(req.url, true);
  const routePath = parsedURL.pathname.replace(/^\/+|\/+$/g, "");
  const queryString = parsedURL.query;
  const { method: methodReq, headers } = req;
  method = methodReq.toLowerCase();
  const decoder = new StringDecoder();
  let buffer = "";

  req.on("data", (data) => {
    buffer += decoder.write(data);
  });

  req.on("end", async () => {
    buffer += decoder.end();
    let payloadReq = {};
    try {
      if (buffer) payloadReq = JSON.parse(buffer);
    } catch {
      console.log("Non JSON data in req" + buffer);
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Json body expected" }));
      return;
    }
    const data = {
      routePath,
      queryString,
      method,
      headers,
      payloadReq,
    };
    const chosenHandler =
      typeof route[routePath] !== "undefined"
        ? route[routePath]
        : route["unknown"];
    let statusCode, payload;
    try {
      [statusCode, payload] = await chosenHandler(data);
      console.log(statusCode, payload);
      statusCode = typeof statusCode === "number" ? statusCode : 200;
      payload = typeof payload === "object" ? payload : {};
    } catch (e) {
      console.log(e);
      statusCode = 500;
      payload = { Error: "Undefind problem in handler selected" };
    } finally {
      const payloadString = JSON.stringify(payload);

      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(payloadString);

      if (statusCode == 200) {
        console.log(
          "\x1b[32m%s\x1b[0m",
          method.toUpperCase() + " /" + routePath + " " + statusCode
        );
      } else {
        console.log(
          "\x1b[31m%s\x1b[0m",
          method.toUpperCase() + " /" + routePath + " " + statusCode
        );
      }
    }
  });
});

server.listen(3000, console.log("Listening on port 3000"));
