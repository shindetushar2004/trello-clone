const fs = require("fs");
const https = require("https");

// Read project config
const projectConfig = JSON.parse(
  fs.readFileSync(".vercel/project.json", "utf8"),
);
const authConfig = JSON.parse(
  fs.readFileSync(
    require("path").join(process.env.USERPROFILE, ".vercel/auth.json"),
    "utf8",
  ),
);

const projectId = projectConfig.projectId;
const token = authConfig.token;

const envVars = [
  {
    key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    value: "YOUR_CLERK_PUBLISHABLE_KEY",
  },
  {
    key: "CLERK_SECRET_KEY",
    value: "YOUR_CLERK_SECRET_KEY",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    value: "YOUR_SUPABASE_URL",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    value:
      "YOUR_SUPABASE_ANON_KEY",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    value: "YOUR_SUPABASE_SERVICE_ROLE_KEY",
  },
  { key: "RESEND_API_KEY", value: "YOUR_RESEND_API_KEY" },
  { key: "RESEND_DEV_TO_EMAIL", value: "your-email@example.com" },
  { key: "INVITE_FROM_EMAIL", value: "onboarding@example.com" },
  {
    key: "NEXT_PUBLIC_APP_URL",
    value: "https://trello-clone-fullstack.vercel.app",
  },
];

function setEnvVar(key, value) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ key, value, target: ["production"] });
    const options = {
      hostname: "api.vercel.com",
      path: `/v10/projects/${projectId}/env`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(`✓ Set ${key}`);
        } else {
          reject(`✗ Failed to set ${key}: ${responseData}`);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function setupEnv() {
  console.log("Setting up environment variables...\n");
  for (const env of envVars) {
    try {
      const result = await setEnvVar(env.key, env.value);
      console.log(result);
    } catch (err) {
      console.error(`Error: ${err}`);
    }
  }
  console.log("\n✓ All environment variables have been set!");
  console.log("Deploying to production...");
}

setupEnv();
