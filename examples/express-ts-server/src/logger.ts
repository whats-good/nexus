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

const NODE_ENV = process.env.NODE_ENV || "development";

export const logger = NODE_ENV === "development" ? devLogger : prodLogger;
