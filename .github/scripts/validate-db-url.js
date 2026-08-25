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

  const hostMatch = finalUrl.match(/@([^:\/]+)/);
  if (hostMatch && hostMatch[1].endsWith(".supabase.co") && !hostMatch[1].includes("pooler")) {
    console.log("⚠️ NOTICE: Direct host detected (" + hostMatch[1] + "). GitHub Actions runners communicate over IPv4.");
    console.log("If pg_dump fails with timeout or Could Not Resolve Host, use Supabase Session Pooler URL (e.g. aws-0-[region].pooler.supabase.com or db.[ref].pooler.supabase.com on port 5432).");
  }

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
