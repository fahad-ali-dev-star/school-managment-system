const fs = require("fs");

const rawUrl = process.env.RAW_DB_URL;
if (!rawUrl) {
  console.error("❌ ERROR: Neither SUPABASE_DB_URL, DATABASE_URL, nor POSTGRES_URL secret is set in GitHub Secrets.");
  console.error("Please add SUPABASE_DB_URL or DATABASE_URL under repository Settings -> Secrets and variables -> Actions.");
  process.exit(1);
}

try {
  let cleanUrl = rawUrl.trim().replace(/^["'\s]+|["'\s]+$/g, "");
  let protocol = "postgresql://";
  if (cleanUrl.startsWith("postgres://")) protocol = "postgres://";
  else if (cleanUrl.startsWith("postgresql://")) protocol = "postgresql://";
  else {
    console.error("❌ ERROR: Database URL must start with postgresql:// or postgres://");
    process.exit(1);
  }

  const numAts = (cleanUrl.match(/@/g) || []).length;
  const lastAtIdx = cleanUrl.lastIndexOf("@");
  const hashIdx = cleanUrl.indexOf("#");
  const hasUnencodedChars = numAts > 1 || (hashIdx !== -1 && hashIdx < lastAtIdx);

  let finalUrl = "";
  if (!hasUnencodedChars) {
    try {
      const u = new URL(cleanUrl);
      if (!u.searchParams.has("sslmode")) {
        u.searchParams.set("sslmode", "require");
      }
      finalUrl = u.toString();
      console.log("✅ Connection URL parsed cleanly with standard URL parser.");
    } catch (e) {}
  }

  if (!finalUrl) {
    console.log("ℹ️ Unencoded special characters detected in database password. Auto-encoding password...");
    const remainder = cleanUrl.slice(protocol.length);
    const relLastAt = remainder.lastIndexOf("@");
    if (relLastAt === -1) {
      console.error("❌ ERROR: Unable to locate host separator (@) in connection string.");
      process.exit(1);
    }

    const userinfo = remainder.slice(0, relLastAt);
    const hostAndBeyond = remainder.slice(relLastAt + 1);
    const firstColonIdx = userinfo.indexOf(":");
    let user = userinfo;
    let pass = "";
    if (firstColonIdx !== -1) {
      user = userinfo.slice(0, firstColonIdx);
      pass = userinfo.slice(firstColonIdx + 1);
    }

    try {
      pass = encodeURIComponent(decodeURIComponent(pass));
    } catch (e) {
      pass = encodeURIComponent(pass);
    }

    const tempUrlStr = `${protocol}${user}:${pass}@${hostAndBeyond}`;
    try {
      const u = new URL(tempUrlStr);
      if (!u.searchParams.has("sslmode")) {
        u.searchParams.set("sslmode", "require");
      }
      finalUrl = u.toString();
    } catch (e2) {
      finalUrl = tempUrlStr;
    }
  }

  // Parse host, user, port, and query for pooler optimization
  try {
    const u = new URL(finalUrl);
    
    // Fix 1: Port check - pg_dump REQUIRES Session mode (port 5432).
    // Port 6543 is Transaction mode which breaks pg_dump.
    if (u.port === "6543") {
      console.log("ℹ️ Detected Transaction Pooler port (6543). Switching port to 5432 (Session Pooler mode) for pg_dump compatibility.");
      u.port = "5432";
      u.searchParams.delete("pgbouncer");
    }

    // Fix 2: Supabase Direct Host (IPv6) Warning
    if (u.hostname.endsWith(".supabase.co") && !u.hostname.includes("pooler")) {
      console.log("⚠️ NOTICE: Direct host detected (" + u.hostname + "). Standard GitHub Actions runners use IPv4.");
      console.log("If pg_dump fails with 'Could Not Resolve Host' or connection timeout, update your SUPABASE_DB_URL secret to use your Supabase Session Pooler connection string.");
    }

    // Fix 3: Log Supabase Pooler diagnostic tips if using pooler domain
    if (u.hostname.includes("pooler.supabase.com")) {
      console.log(`ℹ️ Connecting via Supabase Pooler: ${u.hostname}:${u.port || 5432} as user '${u.username}'`);
    }

    finalUrl = u.toString();
  } catch (e) {}

  console.log("✅ Database connection URL validated and sanitized successfully.");
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `CLEAN_DB_URL=${finalUrl}\n`);
  } else {
    console.log("CLEAN_DB_URL:", finalUrl);
  }
} catch (err) {
  console.error("❌ Error validating DB_URL:", err.message);
  process.exit(1);
}
