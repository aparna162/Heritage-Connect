// server/index.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// helper: detect which monument is mentioned
function detectSite(lower) {
  if (lower.includes("qutub")) return "qutub";
  if (lower.includes("taj")) return "taj";
  if (lower.includes("hawa")) return "hawa";
  return null;
}

// helper: check if today is weekend (Sat/Sun)
const isWeekend = (date = new Date()) => {
  const d = date.getDay(); // 0 = Sunday ... 6 = Saturday [web:566][web:578]
  return d === 0 || d === 6;
};

app.get("/", (req, res) => {
  res.send("HeritageConnect API is running");
});

app.post("/chat", async (req, res) => {
  try {
    const { text } = req.body;
    console.log("CHAT BODY:", req.body);

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const lower = text.toLowerCase();
    const siteId = detectSite(lower);
    const weekend = isWeekend();

    let reply =
      `You said: "${text}". Ask about sites or say ` +
      `"book tickets" to start.`;

    // 1) Weekend combo + specific site
    if (lower.includes("weekend combo") && siteId) {
      let siteName = "that site";
      if (siteId === "qutub") siteName = "Qutub Minar";
      if (siteId === "taj") siteName = "Taj Mahal";
      if (siteId === "hawa") siteName = "Hawa Mahal";

      if (!weekend) {
        reply =
          `Weekend Combo is only valid on Saturdays and Sundays.\n` +
          `You can still book tickets for ${siteName} at regular prices today, and use Family Pack or Student discounts if they apply.`;
      } else {
        reply =
          `🔥 Weekend Combo locked in for ${siteName}!\n\n` +
          "Here is what I’ll do next:\n" +
          "• Apply 15% Weekend Combo discount\n" +
          `• Set monument: ${siteName}\n` +
          "• Prepare a quick ticket summary for you\n\n" +
          "Tell me how many tickets you need (for example, “2 Indian, 1 foreign”) and I’ll show you the final price.";
      }
    }

    // 2) Weekend combo phrase (no specific site)
    else if (lower.includes("weekend combo") || lower.includes("combo")) {
      if (!weekend) {
        reply =
          "Weekend Combo is only available on Saturdays and Sundays.\n" +
          "You can still get:\n" +
          "• Family Pack: Save up to ₹300 on 4+ tickets\n" +
          "• Student Discount: Extra 10% off with valid ID.";
      } else {
        reply =
          "You’re going for the Weekend Combo (15% off on 2+ monuments). 🎉\n\n" +
          "Which monument would you like to include first? For example: Taj Mahal, Qutub Minar, Hawa Mahal.";
      }
    }

    // 3) Only a site name (like "hawa" / "qutub minar" / "taj mahal")
    else if (siteId && !lower.includes("book")) {
      let siteName = "that site";
      if (siteId === "qutub") siteName = "Qutub Minar";
      if (siteId === "taj") siteName = "Taj Mahal";
      if (siteId === "hawa") siteName = "Hawa Mahal";

      reply =
        `Here are the details for ${siteName}.\n` +
        "You can tap Book Now in the card when you’re ready to continue.";
    }

    // 4) Normal booking intent
    else if (lower.includes("book")) {
      reply =
        "Got it, you want to book tickets. Which site would you like? For example: Taj Mahal, Qutub Minar, Hawa Mahal. You can also click one of the options shown.";
    }

    // 5) Timings intent
    else if (
      lower.includes("time") ||
      lower.includes("timing") ||
      lower.includes("open") ||
      lower.includes("hours")
    ) {
      reply =
        "General timings:\n" +
        "• Most ASI monuments: 9:00 AM – 5:30 PM\n" +
        "• Taj Mahal: 6:00 AM – 7:00 PM (closed Fridays)\n" +
        'Type a specific site name if you want exact timings.';
    }

    // 6) Popular sites
    else if (lower.includes("popular") || lower.includes("sites")) {
      reply =
        "Popular heritage sites:\n" +
        "• Taj Mahal, Agra\n" +
        "• Qutub Minar, Delhi\n" +
        "• Hawa Mahal, Jaipur\n" +
        "• Red Fort, Delhi\n" +
        "Tell me which one you want to explore or book.";
    }

    // 7) Offers / discounts
    else if (
      lower.includes("offer") ||
      lower.includes("discount") ||
      lower.includes("deal")
    ) {
      reply =
        "Current special offers:\n" +
        "• Weekend Combo: 15% off on 2+ monuments (Sat–Sun only)\n" +
        "• Family Pack: Save up to ₹300 on 4+ tickets\n" +
        "• Student Discount: Extra 10% off with valid ID.\n" +
        'You can say, “Book weekend combo for Qutub Minar”.';
    }

    return res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`API running on http://localhost:${PORT}`)
);
