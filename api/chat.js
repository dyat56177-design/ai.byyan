
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
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: message.trim()
            }]
          }],
          generationConfig: {
            maxOutputTokens: 500
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
  const detail =
    data.error?.message || "Tidak ada detail dari Google.";

  console.error("Gemini API error:", response.status, detail);

  return res.status(502).json({
    error: detail,
    googleStatus: response.status
  });
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("");

    return res.status(200).json({
      reply: reply || "Gemini tidak memberikan jawaban teks."
    });
  } catch (error) {
    console.error("Gemini connection error:", error.message);

    return res.status(502).json({
      error: "Tidak bisa terhubung ke Gemini."
    });
  }
      }
