
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Gunakan metode POST."
    });
  }

  const message = req.body?.message;

  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 2000
  ) {
    return res.status(400).json({
      error: "Pesan kosong atau terlalu panjang."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "API key belum dikonfigurasi di server."
    });
  }

  try {
    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: message.trim() }]
          }],
          generationConfig: {
            maxOutputTokens: 250,
            temperature: 0.7
          }
        })
      }
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("Gemini error:", upstream.status, detail);

      return res.status(502).json({
        error: "Gemini gagal memproses permintaan.",
        googleStatus: upstream.status
      });
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");

    if (!upstream.body) {
      return res.end();
    }

    const reader = upstream.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (res.destroyed) {
          await reader.cancel();
          return;
        }

        if (!res.write(value)) {
          await new Promise(resolve => res.once("drain", resolve));
        }
      }
    } finally {
      reader.releaseLock();
    }

    return res.end();
  } catch (error) {
    console.error("Streaming error:", error.message);

    if (!res.headersSent) {
      return res.status(502).json({
        error: "Koneksi ke Gemini gagal."
      });
    }

    return res.end();
  }
}
