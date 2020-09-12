"use strict";

const https = require("https");
const querystring = require("querystring");

const config = require("./config");
const constants = require("./helpers").constants;

const external = {};

external.stripePayment = (orderId, amount, description, token) => {
  const payload = {
    amount: amount * 100,
    currency: "inr",
    source: `${token}`,
    description: `${description}`,
    metadata: { orderId: `${orderId}` },
  };
  // console.log(payload);

  const stringPayload = querystring.stringify(payload);

  const requestDetails = {
    protocol: "https:",
    hostname: "api.stripe.com",
    method: "post",
    path: "/v1/charges",
    auth: config.stripe.apikey,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(stringPayload),
      Authorization:
        "Basic " +
        Buffer.from(config.stripe.apikey + ":", "utf8").toString("base64"),
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(requestDetails, function (res) {
      const status = res.statusCode;
      let responseString = "";

      res.on("data", function (data) {
        responseString += data;
      });

      res.on("end", function () {
        if (status === 200 || status === 201) {
          const stripeResponsePayload = JSON.parse(responseString);
          resolve(stripeResponsePayload);
        } else {
          // console.log(responseString);
          reject("Status code returned was " + status);
        }
      });
    });
    req.on("error", (err) => {
      reject(err);
    });
    if (stringPayload) {
      req.write(stringPayload);
    }
    req.end();
  });
};

external.mailgunMail = (toEmail, subject, mailText) => {
  const payload = {
    from: config.mailgun.from,
    to: toEmail,
    subject: subject,
    text: mailText,
  };
  console.log(payload);
  const stringPayload = querystring.stringify(payload);

  const requestDetails = {
    protocol: "https:",
    hostname: "api.mailgun.net",
    method: "post",
    path: "/v3/sandboxb778c562dc6b40a0baf57ed5c30fc3a8.mailgun.org/messages",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(stringPayload),
      Authorization:
        "Basic " +
        Buffer.from("api:" + config.mailgun.apikey, "utf8").toString("base64"),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(requestDetails, function (res) {
      // Grab the status of the send request
      const status = res.statusCode;
      var responseString = "";

      res.on("data", function (data) {
        responseString += data;
        // save all the data from response
      });

      res.on("end", function () {
        const mailgunPayload = JSON.parse(responseString);
        if (
          status === constants.HTTP_STATUS_OK ||
          status === constants.HTTP_STATUS_CREATED
        ) {
          resolve(mailgunPayload);
        } else {
          console.log(responseString);
          reject("Status code returned was " + status);
        }
      });
    });

    //Bind to the err event so it doesn't get thrown
    req.on("error", function (e) {
      reject(e);
    });

    req.write(stringPayload);
    req.end();
  });
};

module.exports = external;
