import "dotenv/config";
import { google } from "googleapis";
import * as readline from "readline";

async function main() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Missing GOOGLE_DRIVE_CLIENT_ID or GOOGLE_DRIVE_CLIENT_SECRET in .env");
    return;
  }

  // Google OAuth2 Client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "http://localhost"
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive"],
  });

  console.log("\n=======================================================");
  console.log(" Google Drive Refresh Token Generator");
  console.log("=======================================================\n");
  console.log("1. Open the following URL in your browser:\n");
  console.log(authUrl);
  console.log("\n2. Log into your Google account and grant Drive permissions.");
  console.log("3. After consenting, your browser will redirect to http://localhost/?code=... (page may show 'cannot connect').");
  console.log("4. Copy the 'code' parameter from the URL bar (everything between 'code=' and '&' or end of URL).");
  console.log("5. Paste the code below:\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("Enter code: ", async (rawCode) => {
    rl.close();
    const code = decodeURIComponent(rawCode.trim());
    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log("\n SUCCESS! New Refresh Token received:");
      console.log("-------------------------------------------------------");
      console.log(tokens.refresh_token);
      console.log("-------------------------------------------------------");
      console.log("Update GOOGLE_DRIVE_REFRESH_TOKEN in your .env file.\n");
    } catch (err: any) {
      console.error("\n❌ Error retrieving token:", err?.response?.data || err?.message || err);
    }
  });
}

main();
