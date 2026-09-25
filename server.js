const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

// YouTube URL se video ID nikalna
function getYouTubeVideoId(rawUrl) {
  let url;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  // youtube.com/watch?v=VIDEO_ID
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    // youtube.com/shorts/VIDEO_ID
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/")[2];
    }

    // youtube.com/embed/VIDEO_ID
    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/")[2];
    }
  }

  // youtu.be/VIDEO_ID
  if (host === "youtu.be") {
    return url.pathname.split("/")[1];
  }

  return null;
}

function cleanVideoId(id) {
  if (!id) return null;

  // Normal YouTube video IDs are generally 11 characters.
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return null;
  }

  return id;
}

// YouTube URL identify/preview
app.post("/api/youtube/info", (req, res) => {
  try {
    const { url } = req.body || {};

    if (!url) {
      return res.status(400).json({
        ok: false,
        error: "YouTube URL is required."
      });
    }

    const videoId = cleanVideoId(getYouTubeVideoId(url));

    if (!videoId) {
      return res.status(400).json({
        ok: false,
        error: "Valid YouTube video URL nahi mili."
      });
    }

    res.json({
      ok: true,
      videoId,

      // Public thumbnail for preview
      thumbnail:
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,

      // Demo information
      authorized: false,

      message:
        "Demo mode: authorization/source file required before download.",

      qualities: [
        {
          quality: "144p",
          available: false
        },
        {
          quality: "360p",
          available: false
        },
        {
          quality: "480p",
          available: false
        },
        {
          quality: "720p",
          available: false
        },
        {
          quality: "1080p",
          available: false
        }
      ]
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: "Unable to process URL."
    });
  }
});

// Demo download endpoint
// Actual YouTube media download intentionally disabled.
app.get("/api/download", (_req, res) => {
  res.status(403).json({
    ok: false,
    error:
      "Demo mode: YouTube media download is disabled. Add an authorized source file to enable downloading."
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "VideoDown demo backend"
  });
});

// Frontend
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`VideoDown server running on port ${PORT}`);
});
