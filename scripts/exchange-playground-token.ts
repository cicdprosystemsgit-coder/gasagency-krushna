import "dotenv/config";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const code = process.argv[2]?.trim();
  if (!code) {
    console.error("Usage: npx tsx scripts/exchange-playground-token.ts <AUTHORIZATION_CODE>");
    process.exit(1);
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

  const oauth2 = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "https://developers.google.com/oauthplayground"
  );

  try {
    const { tokens } = await oauth2.getToken(code);
    console.log("Tokens received:", tokens);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      console.warn("No refresh_token returned. Did you set prompt=consent? Received:", tokens);
      return;
    }

    console.log("\n================================================");
    console.log(" NEW REFRESH TOKEN:");
    console.log(refreshToken);
    console.log("================================================\n");

    // Automatically update .env file
    const envPath = path.resolve(process.cwd(), ".env");
    let envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("GOOGLE_DRIVE_REFRESH_TOKEN=")) {
      envContent = envContent.replace(
        /GOOGLE_DRIVE_REFRESH_TOKEN=.*/,
        `GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`
      );
      fs.writeFileSync(envPath, envContent, "utf-8");
      console.log(" Updated .env file automatically with the new refresh token!");
    }
  } catch (err: any) {
    console.error("Failed to exchange code:", err?.response?.data || err?.message || err);
  }
}

main();
