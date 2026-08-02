const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",

  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m"
};

function color(text, colorCode) {
  return `${colorCode}${text}${colors.reset}`;
}

// 🎯 Method colors
function colorMethod(method) {
  switch (method) {
    case "GET": return color(method, colors.green);
    case "POST": return color(method, colors.blue);
    case "PUT": return color(method, colors.yellow);
    case "DELETE": return color(method, colors.red);
    case "PATCH": return color(method, colors.magenta);
    default: return color(method, colors.white);
  }
}

// 🎯 Status colors
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
      // only recurse into real objects/arrays, skip null
      result[key] = maskSensitive(value, keysToMask);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function safeStringify(value, sensitiveKeys, maxLength) {
  try {
    if (value === undefined) return "";
    const safe =
      typeof value === "object" && value !== null
        ? maskSensitive(value, sensitiveKeys)
        : value;
    let str = typeof safe === "string" ? safe : JSON.stringify(safe);
    if (maxLength !== Infinity && str.length > maxLength) {
      str = str.slice(0, maxLength) + `... [truncated, ${str.length} chars total]`;
    }
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
  // how many chars of req/res body to print before truncating.
  // Infinity by default = full body always printed, no cutoff.
  const maxBodyLength = options.maxBodyLength ?? Infinity;

  return function (req, res, next) {
    const start = process.hrtime.bigint();

    // capture the response body by wrapping res.json / res.send
    let resBody;
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = (data) => {
      resBody = data;
      return originalJson(data);
    };

    res.send = (data) => {
      if (resBody === undefined) resBody = data;
      return originalSend(data);
    };

    res.on("finish", () => {
      // hrtime is higher resolution and cheaper than Date.now() diffs for timing
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

      const method = colorMethod(req.method);

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.get("host");
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;
      const url = color(fullUrl, colors.cyan);

      const status = colorStatus(res.statusCode);
      const time = color(`${durationMs.toFixed(1)}ms`, colors.magenta);
      const timestamp = color(new Date().toISOString(), colors.white);

      // 🔐 Safe body masking — request
      let reqBodyStr = "";
      if (req.body && Object.keys(req.body).length > 0) {
        reqBodyStr = safeStringify(req.body, sensitiveKeys, maxBodyLength);
      }
      const reqBodyLog = reqBodyStr
        ? color(`req:${reqBodyStr}`, colors.yellow)
        : "";

      // 🔐 Safe body masking — response
      const resBodyStr = safeStringify(resBody, sensitiveKeys, maxBodyLength);
      const resBodyLog = resBodyStr
        ? color(`res:${resBodyStr}`, colors.cyan)
        : "";

      // process.stdout.write with one pre-built string is faster than console.log,
      // which does extra formatting/inspection work per argument.
      process.stdout.write(
        `${method} ${url} ${status} ${time} ${timestamp} ${reqBodyLog} ${resBodyLog}\n`
      );
    });

    next();
  };
}

// Error-logging middleware. Mount this AFTER your routes (and after apilogger()),
// as the LAST app.use(). Express recognizes it as an error handler because it
// takes 4 arguments (err, req, res, next).
function errorLogger(options = {}) {
  return function (err, req, res, next) {
    const method = colorMethod(req.method);
    const url = color(req.originalUrl, colors.cyan);
    const timestamp = color(new Date().toISOString(), colors.white);
    const status = color(err.status || err.statusCode || 500, colors.red);
    const message = color(err.message || "Unknown error", colors.red);
    const stack = options.showStack !== false && err.stack ? `\n${err.stack}` : "";

    process.stdout.write(
      `${method} ${url} ${status} ${timestamp} ERROR: ${message}${stack}\n`
    );

    // hand off to your own error handler / default Express handler
    next(err);
  };
}

export default apilogger;
export { errorLogger };