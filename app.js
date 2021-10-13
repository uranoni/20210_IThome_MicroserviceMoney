var express = require("express");
var sha256 = require("js-sha256");
var _ = require("lodash");
var app = express();

var axios = require("axios");
const {
  scrypt,
  randomFill,
  createCipheriv,
  createDecipheriv,
} = require("crypto");

const { reduce } = require("lodash");
app.use(express.json({ limit: "100mb" })); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// const nonce =
//   "NjM3Njk2NzY4NzA4NjAuODozMjcwNzE5ZDA5MTg2ZmE0Y2I4MWE3YWU0ZDQ5OGYwMzBjOGNlMjg3NGM3ZDg0ZTU3ZWVhOTNjMWY0N2I0Zjhj";
const hashid = "87282A2FA0E209EBE1B3713AB56A06C2";
// const msg = `{"ShopNo":"NA0249_001","OrderNo":"202107111119291750","Amount":50000,"CurrencyID":"TWD","PayType":"C","ATMParam":{},"CardParam":{"AutoBilling":"N","ExpMinutes":30},"PrdtName":"pp","ReturnURL":"http://10.11.22.113:8803/QPay.ApiClient-Sandbox/Store/Return","BackendURL":"https://sandbox.sinopac.com/funBIZ.ApiClient/AutoPush/PushSuccess"}`;

// const ddmsg = {
//   ShopNo: "NA0249_001",
//   OrderNo: "202107111119291750",
//   Amount: 50000,
//   CurrencyID: "TWD",
//   PayType: "C",
//   PrdtName: "pp",
//   ReturnURL: "http://10.11.22.113:8803/QPay.ApiClient-Sandbox/Store/Return",
//   BackendURL:
//     "https://sandbox.sinopac.com/funBIZ.ApiClient/AutoPush/PushSuccess",
// };

function xor(hex1, hex2) {
  const buf1 = Buffer.from(hex1, "hex");
  const buf2 = Buffer.from(hex2, "hex");
  const bufResult = buf1.map((b, i) => b ^ buf2[i]);
  return bufResult.toString("hex");
}

function sign(msg) {
  var result = _.omitBy(
    msg,
    (v) => _.isUndefined(v) || _.isNull(v) || v === ""
  );

  var resultkeys = _.without(_.keys(result), "").sort();
  console.log(resultkeys);
  var hashstring = resultkeys.reduce((acc, cur, idx) => {
    if (idx == resultkeys.length - 1) {
      return acc + `${cur}=${result[cur]}`;
    }
    return acc + `${cur}=${result[cur]}&`;
  }, "");
  return hashstring;
}

// app.post("/hashid", function (req, res, next) {
//   const a = xor(req.body.A1, req.body.A2);
//   const b = xor(req.body.B1, req.body.B2);
//   const result = a + b;
//   res.send(result.toLocaleUpperCase());
// });

app.post("/sign", async function (req, res, next) {
  // console.log(req.body);
  // var result = sign(req.body);
  const Nonce = await callnonce();
  var result = sign(msg);
  const hashrr = result + Nonce + hashid;
  const hashresult = sha256(result + Nonce + hashid);
  res.send(hashresult.toLocaleUpperCase());
});

// app.post("/message", async function (req, res, next) {
//   const IV = sha256(nonce).substr(-16, 16).toLocaleUpperCase();
//   const cipher = createCipheriv("aes-256-cbc", hashid, IV);
//   let encrypted = cipher.update(msg, "utf8", "hex");
//   encrypted += cipher.final("hex");
//   const result = encrypted.toLocaleUpperCase();
//   console.log(encrypted);

//   res.send(result);
// });

async function callnonce() {
  return axios
    .post("https://apisbx.sinopac.com/funBIZ/QPay.WebAPI/api/Nonce", {
      ShopNo: "NA0249_001",
    })
    .then((res) => {
      return res.data.Nonce;
    })
    .catch((r) => {
      return r;
    });
}

function getsign(nonce, msg) {
  var result = sign(msg);
  // const hashrr = result + nonce + hashid;
  const hashresult = sha256(result + nonce + hashid);
  return hashresult.toLocaleUpperCase();
}

function decmessage(nonce, msg) {
  const IV = sha256(nonce).substr(-16, 16).toLocaleUpperCase();
  const cipher = createCipheriv("aes-256-cbc", hashid, IV);
  let encrypted = cipher.update(msg, "utf8", "hex");
  encrypted += cipher.final("hex");
  const result = encrypted.toLocaleUpperCase();
  // console.log(encrypted);

  return result;
}
app.get("/jsonstring", (req, res) => {
  const { OrderNo, Amount } = { ...req.body };
  const ddmsg = {
    ShopNo: "NA0249_001",
    OrderNo,
    Amount: Amount * 1,
    CurrencyID: "TWD",
    PayType: "C",
    PrdtName: "pp",
    ReturnURL: "http://10.11.22.113:8803/QPay.ApiClient-Sandbox/Store/Return",
    BackendURL:
      "https://sandbox.sinopac.com/funBIZ.ApiClient/AutoPush/PushSuccess",
  };
  res.send(JSON.stringify(ddmsg));
});

app.post("/createOrder", async function (req, res) {
  // auto pay string
  const { OrderNo, Amount } = { ...req.body };
  let ddmsg = {
    ShopNo: "NA0249_001",
    OrderNo,
    Amount: Amount * 1,
    CurrencyID: "TWD",
    PayType: "C",
    PrdtName: "pp",
    ReturnURL: "http://10.11.22.113:8803/QPay.ApiClient-Sandbox/Store/Return",
    BackendURL:
      "https://sandbox.sinopac.com/funBIZ.ApiClient/AutoPush/PushSuccess",
  };
  let msg = {
    ShopNo: "NA0249_001",
    OrderNo,
    Amount: Amount * 1,
    CurrencyID: "TWD",
    PayType: "C",
    PrdtName: "pp",
    CardParam: { AutoBilling: "Y" },
    ReturnURL: "http://10.11.22.113:8803/QPay.ApiClient-Sandbox/Store/Return",
    BackendURL:
      "https://sandbox.sinopac.com/funBIZ.ApiClient/AutoPush/PushSuccess",
  };
  const Version = "1.0.0";
  const ShopNo = "NA0249_001";
  const APIService = "OrderCreate";
  const Nonce = await callnonce();
  const signData = getsign(Nonce, ddmsg);
  const Message = decmessage(Nonce, JSON.stringify(msg));
  // console.log(Nonce);
  // console.log(signData);
  // console.log(Message);
  return axios
    .post("https://apisbx.sinopac.com/funBIZ/QPay.WebAPI/api/Order", {
      Version,
      ShopNo,
      APIService,
      Sign: signData,
      Nonce,
      Message,
    })
    .then(({ data }) => {
      return res.send(data);
    })
    .catch((data) => {
      return res.send(data);
    });
});

app.post("/OrderQuery", async function (req, res) {
  // auto pay string
  const { OrderNo, Amount } = { ...req.body };
  let ddmsg = {
    ShopNo: "NA0249_001",
    // OrderNo: "A2020010100000000",
    PayType: "C",
  };
  let msg = {
    ShopNo: "NA0249_001",
    // OrderNo: "A2020010100000000",
    PayType: "C",
  };
  const Version = "1.0.0";
  const ShopNo = "NA0249_001";
  const APIService = "OrderQuery";
  const Nonce = await callnonce();
  const signData = getsign(Nonce, ddmsg);
  const Message = decmessage(Nonce, JSON.stringify(msg));
  // console.log(Nonce);
  // console.log(signData);
  // console.log(Message);
  return axios
    .post("https://apisbx.sinopac.com/funBIZ/QPay.WebAPI/api/Order", {
      Version,
      ShopNo,
      APIService,
      Sign: signData,
      Nonce,
      Message,
    })
    .then(({ data }) => {
      return res.send(data);
    })
    .catch((data) => {
      return res.send(data);
    });
});

app.post("/dec", function (req, res) {
  const IV = sha256(req.body.nonce).substr(-16, 16).toLocaleUpperCase();
  let decipher = createDecipheriv("aes-256-cbc", hashid, IV);
  let decrypted = decipher.update(req.body.encrypted, "hex");
  return res.send(decrypted + decipher.final("utf8"));
});
app.listen(8888);
