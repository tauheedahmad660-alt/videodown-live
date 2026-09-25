const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const safeName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Sirf video files allowed hain."));
    }
  }
});

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: "Video file select karo."
    });
  }

  res.json({
    ok: true,
    message: "Video successfully uploaded.",
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    downloadUrl: `/api/download/${encodeURIComponent(req.file.filename)}`
  });
});

app.get("/api/download/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      ok: false,
      error: "Video file nahi mili."
    });
  }

  res.download(filePath, filename);
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "VideoDown authorized media backend"
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  res.status(400).json({
    ok: false,
    error: err.message || "Upload failed."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`VideoDown server running on port ${PORT}`);
});
