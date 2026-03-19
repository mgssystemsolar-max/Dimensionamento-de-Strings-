import express from "express";
import { createServer as createViteServer } from "vite";
import { ExpressAuth } from "@auth/express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Resend } from "resend";
import path from "path";

let prismaClient: PrismaClient | null = null;
let resendClient: Resend | null = null;

function getPrisma(): PrismaClient {
  if (!prismaClient) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prismaClient = new PrismaClient({ adapter });
  }
  return prismaClient;
}

function getResend(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Trust proxy for secure cookies
  app.set("trust proxy", true);

  // Auth.js route
  app.use(
    "/api/auth/*",
    (req, res, next) => {
      try {
        const prisma = getPrisma();
        const resend = getResend();
        ExpressAuth({
          adapter: PrismaAdapter(prisma),
          providers: [
            {
              id: "resend",
              name: "Email",
              type: "email",
              sendVerificationRequest: async ({ identifier: email, url }) => {
                const { host } = new URL(url);
                try {
                  await resend.emails.send({
                    from: "onboarding@resend.dev",
                    to: email,
                    subject: `Sign in to ${host}`,
                    html: `<p>Click the link below to sign in:</p><p><a href="${url}">Sign in</a></p>`,
                  });
                } catch (error) {
                  console.error("Failed to send verification email", error);
                  throw new Error("Failed to send verification email");
                }
              },
            },
          ],
          secret: process.env.NEXTAUTH_SECRET || "secret",
          trustHost: true,
          callbacks: {
            async session({ session, user }) {
              if (session.user) {
                session.user.id = user.id;
              }
              return session;
            },
          },
        })(req, res, next);
      } catch (error) {
        console.error("Auth initialization error:", error);
        res.status(500).json({ error: "Authentication service unavailable" });
      }
    }
  );

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
