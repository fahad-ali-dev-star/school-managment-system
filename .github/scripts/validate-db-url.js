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

  const remainder = cleanUrl.slice(protocol.length);
  const lastAtIdx = remainder.lastIndexOf("@");
  if (lastAtIdx === -1) {
    console.error("❌ ERROR: Unable to locate host separator (@) in connection string.");
    process.exit(1);
  }

  const userinfo = remainder.slice(0, lastAtIdx);
  const hostAndBeyond = remainder.slice(lastAtIdx + 1);

  const firstColonIdx = userinfo.indexOf(":");
  let user = userinfo;
  let pass = "";
  if (firstColonIdx !== -1) {
    user = userinfo.slice(0, firstColonIdx);
    pass = userinfo.slice(firstColonIdx + 1);
  }

  // Decode password so PGPASSWORD contains raw password
  let decodedPass = pass;
  try {
    decodedPass = decodeURIComponent(pass);
  } catch (e) {}

  let [hostPortDb, queryStr] = hostAndBeyond.split("?");
  let [hostPort, ...dbParts] = hostPortDb.split("/");
  let dbname = dbParts.join("/") || "postgres";
  let [host, port] = hostPort.split(":");

  port = port || "5432";
  if (port === "6543") {
    console.log("ℹ️ Switching port 6543 to 5432 (Session Mode for pg_dump compatibility).");
    port = "5432";
  }

  // Re-encode password for URL fallback
  const encodedPass = encodeURIComponent(decodedPass);
  const finalUrl = `${protocol}${user}:${encodedPass}@${host}:${port}/${dbname}?sslmode=require`;

  console.log(`ℹ️ Parsed PostgreSQL connection params: Host=${host}, Port=${port}, User=${user}, Database=${dbname}`);

  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `CLEAN_DB_URL=${finalUrl}\n`);
    fs.appendFileSync(process.env.GITHUB_ENV, `PGHOST=${host}\n`);
    fs.appendFileSync(process.env.GITHUB_ENV, `PGPORT=${port}\n`);
    fs.appendFileSync(process.env.GITHUB_ENV, `PGUSER=${user}\n`);
    fs.appendFileSync(process.env.GITHUB_ENV, `PGDATABASE=${dbname}\n`);
    fs.appendFileSync(process.env.GITHUB_ENV, `PGPASSWORD=${decodedPass}\n`);
    fs.appendFileSync(process.env.GITHUB_ENV, `PGSSLMODE=require\n`);
  } else {
    console.log("CLEAN_DB_URL:", finalUrl);
  }
} catch (err) {
  console.error("❌ Error validating DB_URL:", err.message);
  process.exit(1);
}
