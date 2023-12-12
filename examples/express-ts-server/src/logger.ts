import winston from "winston";

const devLogger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  exitOnError: true,
  transports: [new winston.transports.Console()],
});

const prodLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  exitOnError: false,
  transports: [new winston.transports.Console()],
});

export const logger =
  process.env.NODE_ENV === "production" ? prodLogger : devLogger;
