import http from "http";
import app from "./app";
import { connectToRedis } from "./redis";

const server = http.createServer(app);

const port = 8080;

server.listen(port, async () => {
  await connectToRedis();
  console.log("radi i server");
});
