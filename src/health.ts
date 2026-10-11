import express from "express";
import { timingSafeEqual } from "crypto";
import {
  Colors,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
  type Client,
} from "discord.js";
import "dotenv/config";

import Exam from "./schemas/Exam";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "20kb" }));

app.get("/", (_req, res) => {
  res.status(200).send("Welcome to FreshWay Management Bot dashboard.");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "online",
    timestamp: new Date().toISOString(),
  });
});

function safeTokenMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function startHealthServer(client: Client): void {
  app.post("/webhooks/google-form", async (req, res) => {
    const expectedToken = process.env.GOOGLE_FORM_WEBHOOK_SECRET;
    const receivedToken = req.header("x-google-form-token") ?? "";

    if (
      !expectedToken ||
      expectedToken.length < 32 ||
      !safeTokenMatch(receivedToken, expectedToken)
    ) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const submissionId =
      typeof req.body?.submissionId === "string"
        ? req.body.submissionId.trim()
        : "";

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !submissionId ||
      submissionId.length > 200
    ) {
      res.status(400).json({ error: "Invalid submission data" });
      return;
    }

    try {
      // Prevent processing the same Google Forms response twice.
      const alreadyProcessed = await Exam.findOne({ submissionId });

      if (alreadyProcessed) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      const exam = await Exam.findOneAndUpdate(
        { email, status: "pending" },
        {
          $set: {
            status: "submitted",
            submittedAt: new Date(),
            submissionId,
          },
        },
        { new: true, sort: { startedAt: -1 } },
      );

      if (!exam) {
        // The webhook was received, but no pending exam matched this email.
        console.warn(`[Exam] No pending examination matched ${email}`);

        res.status(200).json({
          received: true,
          matched: false,
        });
        return;
      }

      const submittedAt = Math.floor(
        (exam.submittedAt?.getTime() ?? Date.now()) / 1000,
      );

      const container = new ContainerBuilder()
        .setAccentColor(Colors.Green)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "## <:freshway:1525789609601007646> Examination Submitted",
              "The management examination has been submitted successfully.",
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              `**User**\n<@${exam.discordUserId}>`,
              `**Discord ID**\n\`${exam.discordUserId}\``,
              `**Gmail Address**\n\`${exam.email}\``,
              `**Started At**\n<t:${Math.floor(exam.startedAt.getTime() / 1000)}:F>`,
              `**Submitted At**\n<t:${submittedAt}:F>\n<t:${submittedAt}:R>`,
              `**Status**\n\`SUBMITTED\``,
            ].join("\n\n"),
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "-# FreshWay Management • Examination System",
          ),
        );

      // Notify the original channel and the management log channel.
      // Avoid sending twice if both IDs are identical.
      const channelIds = new Set([exam.startChannelId, exam.logChannelId]);

      const deliveryResults = await Promise.allSettled(
        [...channelIds].map(async (channelId) => {
          const channel = await client.channels.fetch(channelId);

          if (!channel?.isSendable()) {
            throw new Error(`Channel ${channelId} is not sendable`);
          }

          await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: {
              users: [exam.discordUserId],
            },
          });
        }),
      );

      const failedDeliveries = deliveryResults.filter(
        (result) => result.status === "rejected",
      );

      if (failedDeliveries.length > 0) {
        console.error(
          "[Exam] Failed to deliver one or more completion logs:",
          failedDeliveries,
        );
      }

      // Keep the database status as submitted even if a Discord channel
      // is temporarily unavailable. Failed deliveries should be retried
      // operationally rather than treating the form as unsubmitted.
      res.status(200).json({
        received: true,
        matched: true,
        notificationsSent: channelIds.size - failedDeliveries.length,
      });
    } catch (error) {
      console.error("[Exam] Webhook processing failed:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Health] Server listening on port ${PORT}`);
  });
}
