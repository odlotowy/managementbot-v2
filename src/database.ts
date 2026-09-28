import mongoose from "mongoose";

import { Logger } from "./util/Logger";

export async function connectDatabase(
  logger: Logger,
  url: string,
): Promise<void> {
  console.log("[Database] Connecting...");

  await mongoose
    .connect(url)
    .then(async () => {
      console.log("[Database] Connected to MongoDB!");

      await logger.database(
        "MongoDB Connected",
        "Successfully connected to MongoDB.",
        undefined,
        {
          host: mongoose.connection.host,
          database: mongoose.connection.name,
        },
      );

      mongoose.connection.on("error", async (error) => {
        console.error("[MongoDB] Error:", error);

        await logger.database(
          "MongoDB Error",
          "MongoDB reported a connection error.",
          error,
        );
      });

      mongoose.connection.on("disconnected", async () => {
        await logger.database(
          "MongoDB Disconnected",
          "MongoDB connection was disconnected.",
        );
      });

      mongoose.connection.on("reconnected", async () => {
        await logger.database(
          "MongoDB Reconnected",
          "MongoDB connection has been restored.",
        );
      });
    })
    .catch(async (err) => {
      console.error(
        "[Database] Error occured while connecting to MongoDB",
        err,
      );

      await logger.database(
        "MongoDB Connection Failed",
        "Could not connect to MongoDB.",
        err,
      );

      throw err;
    });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();

  console.log("[Database] Disconnected from MongoDB.");
}
