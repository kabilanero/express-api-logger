// src/index.js
var colors = {
  reset: "\x1B[0m",
  bright: "\x1B[1m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  cyan: "\x1B[36m",
  magenta: "\x1B[35m",
  white: "\x1B[37m"
};
function color(text, colorCode) {
  return `${colorCode}${text}${colors.reset}`;
}
function colorMethod(method) {
  switch (method) {
    case "GET":
      return color(method, colors.green);
    case "POST":
      return color(method, colors.blue);
    case "PUT":
      return color(method, colors.yellow);
    case "DELETE":
      return color(method, colors.red);
    case "PATCH":
      return color(method, colors.magenta);
    default:
      return color(method, colors.white);
  }
}
function colorStatus(status) {
  if (status >= 500) return color(status, colors.red);
  if (status >= 400) return color(status, colors.yellow);
  if (status >= 300) return color(status, colors.cyan);
  return color(status, colors.green);
}
function maskSensitive(obj, keysToMask) {
  if (typeof obj !== "object" || obj === null) return obj;
  const result = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    const value = obj[key];
    if (keysToMask.includes(key.toLowerCase())) {
      result[key] = "***";
    } else if (typeof value === "object" && value !== null) {
      result[key] = maskSensitive(value, keysToMask);
    } else {
      result[key] = value;
    }
  }
  return result;
}
function safeStringify(value, sensitiveKeys) {
  try {
    if (value === void 0) return "";
    const safe = typeof value === "object" && value !== null ? maskSensitive(value, sensitiveKeys) : value;
    let str = typeof safe === "string" ? safe : JSON.stringify(safe);
    if (str.length > 200) str = str.slice(0, 200) + "...";
    return str;
  } catch {
    return "[unserializable]";
  }
}
function apilogger(options = {}) {
  const sensitiveKeys = options.sensitiveKeys || [
    "password",
    "token",
    "secret",
    "authorization",
    "apikey"
  ];
  return function(req, res, next) {
    const start = process.hrtime.bigint();
    let resBody;
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    res.json = (data) => {
      resBody = data;
      return originalJson(data);
    };
    res.send = (data) => {
      if (resBody === void 0) resBody = data;
      return originalSend(data);
    };
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const method = colorMethod(req.method);
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.get("host");
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;
      const url = color(fullUrl, colors.cyan);
      const status = colorStatus(res.statusCode);
      const time = color(`${durationMs.toFixed(1)}ms`, colors.magenta);
      const timestamp = color((/* @__PURE__ */ new Date()).toISOString(), colors.white);
      let reqBodyStr = "";
      if (req.body && Object.keys(req.body).length > 0) {
        reqBodyStr = safeStringify(req.body, sensitiveKeys);
      }
      const reqBodyLog = reqBodyStr ? color(`req:${reqBodyStr}`, colors.yellow) : "";
      const resBodyStr = safeStringify(resBody, sensitiveKeys);
      const resBodyLog = resBodyStr ? color(`res:${resBodyStr}`, colors.cyan) : "";
      process.stdout.write(
        `${method} ${url} ${status} ${time} ${timestamp} ${reqBodyLog} ${resBodyLog}
`
      );
    });
    next();
  };
}
function errorLogger(options = {}) {
  return function(err, req, res, next) {
    const method = colorMethod(req.method);
    const url = color(req.originalUrl, colors.cyan);
    const timestamp = color((/* @__PURE__ */ new Date()).toISOString(), colors.white);
    const status = color(err.status || err.statusCode || 500, colors.red);
    const message = color(err.message || "Unknown error", colors.red);
    const stack = options.showStack !== false && err.stack ? `
${err.stack}` : "";
    process.stdout.write(
      `${method} ${url} ${status} ${timestamp} ERROR: ${message}${stack}
`
    );
    next(err);
  };
}
var index_default = apilogger;
export {
  index_default as default,
  errorLogger
};
