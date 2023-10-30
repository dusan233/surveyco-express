import http from "http";
import app from "./app";

const server = http.createServer(app);

const port = 8080;

server.listen(port, () => {
  console.log("radi i server");
});
