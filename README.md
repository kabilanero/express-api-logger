# express-dev-logger

Lightweight Express middleware for logging HTTP requests with colored output.

## Installation
```bash
npm install express-dev-logger

```
const express = require("express");
const devLogger = require("express-dev-logger");
const { errorLogger } = require("express-dev-logger");

const app = express();

app.use(express.json());
app.use(devLogger());

app.get("/test", (req, res) => {
  res.send("Hello");
});

app.post("/customer",(req,res)=>{
   const data= req.body
   res.send(data);
})

app.use(errorLogger());

app.listen(3000, () => {
  console.log("server is running on port 3000");
});


```