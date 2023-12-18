import RedisStore from "connect-redis";
import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

export const connectToRedis = async () => {
  redisClient.on("error", (err) => {
    console.log(err, "Redis client error");
  });
  return await redisClient.connect();
};

export const redisStore = new RedisStore({
  client: redisClient,
});
