const express = require("express");
const path = require("path");
const dns = require("dns").promises;
const net = require("net");

const app = express();
const PORT = process.env.PORT || 3000;

// Put only domains you control/are authorized to serve from.
// Example: ALLOWED_HOSTS=media.example.com,cdn.example.com
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || "")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;
  const [a,b,c,d] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

function isPrivateIPv6(ip) {
  const x = ip.toLowerCase();
  return x === "::1" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80:");
}

async function hostIsSafe(hostname) {
  if (net.isIP(hostname)) {
    return !isPrivateIPv4(hostname) && !isPrivateIPv6(hostname);
  }
  const addresses = await dns.lookup(hostname, { all: true });
  return addresses.length > 0 && addresses.every(a =>
    net.isIP(a.address) === 4 ? !isPrivateIPv4(a.address) : !isPrivateIPv6(a.address)
  );
}

function validateMediaUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (u.protocol !== "https:") {
    throw new Error("Only HTTPS media URLs are allowed.");
  }

  const host = u.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.includes(host)) {
    throw new Error("This media host is not allowed. Add your authorized media domain to ALLOWED_HOSTS.");
  }

  return u;
}

// Metadata endpoint. The frontend uses a simple catalog supplied by your own media host.
// For production, replace this with your own database/CMS lookup.
app.post("/api/video/info", async (req, res) => {
  try {
    const { url, title = "Authorized video" } = req.body || {};
    const mediaUrl = validateMediaUrl(url);
    await hostIsSafe(mediaUrl.hostname);

    res.json({
      ok: true,
      title: String(title).slice(0, 160),
      qualities: [
        { quality: "144p", url: mediaUrl.toString() },
        { quality: "360p", url: mediaUrl.toString() },
        { quality: "480p", url: mediaUrl.toString() },
        { quality: "720p", url: mediaUrl.toString() },
        { quality: "1080p", url: mediaUrl.toString() }
      ]
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Stream an authorized media file through your server.
app.get("/api/download", async (req, res) => {
  try {
    const mediaUrl = validateMediaUrl(req.query.url);
    await hostIsSafe(mediaUrl.hostname);

    const response = await fetch(mediaUrl, {
      redirect: "manual",
      headers: { "User-Agent": "VideoDown/1.0" }
    });

    if (!response.ok) {
      return res.status(502).json({ ok: false, error: "Media server returned an error." });
    }

    const contentType = response.headers.get("content-type") || "";
    const length = response.headers.get("content-length");

    if (!contentType.startsWith("video/") && !contentType.includes("octet-stream")) {
      return res.status(415).json({ ok: false, error: "The URL did not return a video file." });
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');
    if (length) res.setHeader("Content-Length", length);

    const nodeStream = require("stream").Readable.fromWeb(response.body);
    nodeStream.pipe(res);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "VideoDown backend" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`VideoDown server running on port ${PORT}`);
});
