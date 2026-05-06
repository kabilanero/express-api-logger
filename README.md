# express-dev-logger

Lightweight Express middleware for logging HTTP requests with colored output.

## Installation
```bash
npm install express-dev-logger

```
const express = require('express');
const logger = require('express-dev-logger');

const app = express();

app.use(express.json());
app.use(logger());

app.get('/', (req, res) => {
  res.send("Hello");
});

```