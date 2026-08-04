import pino from "pino";

// Set LOG_PRETTY=true in dev to enable colorized output
const usePretty = process.env.LOG_PRETTY === "true";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(usePretty && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" }
    }
  })
});

export default logger;
