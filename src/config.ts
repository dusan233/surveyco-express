import convict from "convict";

const config = convict({
  env: {
    doc: "The application environment.",
    format: ["production", "development", "test"],
    default: "development",
    env: "NODE_ENV",
  },
  client: {
    frontendUrl: {
      doc: "Frontend client url address",
      format: String,
      default: "http://localhost:3000",
      env: "FRONTEND_URL",
    },
  },
  cookieParser: {
    secretKey: {
      doc: "Cookie parser secret key",
      format: String,
      default: "secret-keyy",
      enf: "COOKIE_PARSER_SECRET",
    },
  },
  clerkAuth: {
    secretKey: {
      doc: "Secret clerk key",
      format: String,
      default: "secret key",
      env: "CLERK_SECRET_KEY",
    },
    webhookSecretKey: {
      doc: "Webhook secret clerk key",
      format: String,
      default: "webhook secret key",
      env: "CLERK_WEBHOOK_SECRET_KEY",
    },
  },
  db: {
    url: {
      doc: "Database url",
      format: String,
      default: "some-url",
      env: "DATABASE_URL",
    },
  },
  aws: {
    accessKeyId: {
      doc: "Access key id",
      format: String,
      default: "some-access-key-id",
      env: "AWS_ACCESS_KEY_ID",
    },
    secretAccessKey: {
      doc: "Secret access key",
      format: String,
      default: "",
      env: "AWS_SECRET_ACCESS_KEY",
    },
    region: {
      doc: "AWS S3 region",
      format: String,
      default: "",
      env: "AWS_REGION",
    },
    bucketname: {
      doc: "AWS S3 bucketname",
      format: String,
      default: "",
      env: "AWS_BUCKETNAME",
    },
  },
});

export default config;
