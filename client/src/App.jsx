// App.jsx – Stable heritage cards + optional external API search
import React, { useState, useEffect, useRef } from "react";
import {
  FaStar,
  FaClock,
  FaUserFriends,
  FaMapMarkerAlt,
  FaRupeeSign,
  FaTag,
  FaCamera,
  FaTicketAlt,
} from "react-icons/fa";

// --- 1. Local, always-available site data (no API needed) ---
const LOCAL_SITES = [
  {
    id: "taj",
    name: "Taj Mahal",
    city: "Agra, Uttar Pradesh",
    tagline: "UNESCO World Heritage Site - Symbol of eternal love",
    rating: 4.9,
    visitors: "8M+ yearly",
    timings: "6:00 AM - 7:00 PM",
    image:
      "https://images.unsplash.com/photo-1571731566141-0b724e7e30b9?w=800&h=500&fit=crop",
    priceIndian: 50,
    priceForeign: 1300,
  },
  {
    id: "qutub",
    name: "Qutub Minar",
    city: "Delhi",
    tagline: "World's tallest brick minaret",
    rating: 4.5,
    visitors: "2.5M+ yearly",
    timings: "7:00 AM - 5:00 PM",
    image:
      "https://images.unsplash.com/photo-1667849521212-e9843b89f322?w=800&h=500&fit=crop",
    priceIndian: 40,
    priceForeign: 600,
  },
  {
    id: "hawa",
    name: "Hawa Mahal",
    city: "Jaipur, Rajasthan",
    tagline: "The Palace of Winds - Icon of the Pink City",
    rating: 4.7,
    visitors: "2M+ yearly",
    timings: "9:00 AM - 5:00 PM",
    image:
      "https://images.unsplash.com/photo-1695395550316-8995ae9d35ff?w=800&h=500&fit=crop",
    priceIndian: 50,
    priceForeign: 200,
  },
];

// quick access map
const LOCAL_BY_NAME = {
  "taj mahal": LOCAL_SITES[0],
  "qutub minar": LOCAL_SITES[1],
  "hawa mahal": LOCAL_SITES[2],
};

// --- 2. Optional external search (used only for extra sites) ---
const API_BASE = "https://en.wikipedia.org/w/api.php";

// simple search, lightly filtered so it doesn’t block good monuments [web:590]
async function searchExternal(query) {
  const url = `${API_BASE}?action=query&list=search&srsearch=${encodeURIComponent(
    query + " India"
  )}&format=json&origin=*&srlimit=10`;
  const res = await fetch(url);
  const data = await res.json();
  const results = data?.query?.search || [];

  return results
    .filter((hit) => {
      const t = hit.title.toLowerCase();
      if (t.includes("list of") || t.includes("government of")) return false;
      return true;
    })
    .slice(0, 5);
}

// get basic details for one page (used only if we don’t already have a local card) [web:594]
async function getExternalDetails(title) {
  const url = `${API_BASE}?action=query&prop=extracts|pageimages|coordinates&exintro&explaintext&format=json&origin=*&titles=${encodeURIComponent(
    title
  )}&piprop=thumbnail&pithumbsize=600`;
  const res = await fetch(url);
  const data = await res.json();
  const page = Object.values(data.query.pages)[0];

  if (!page) return null;

  return {
    id: title.toLowerCase().replace(/\s+/g, "-"),
    name: page.title,
    city: page.coordinates
      ? `${page.coordinates[0].lat.toFixed(2)}, ${page.coordinates[0].lon.toFixed(
          2
        )}`
      : "India",
    tagline: "Historic attraction",
    rating: 4.5,
    visitors: "1M+ yearly",
    timings: "9:00 AM - 5:00 PM",
    image:
      page.thumbnail?.source ||
      "https://images.unsplash.com/photo-1571896349840-0d7119f78c2d?w=800&h=500&fit=crop",
    priceIndian: 50,
    priceForeign: 500,
  };
}

const isWeekend = () => {
  const d = new Date().getDay();
  return d === 0 || d === 6;
};

const generateBookingId = () =>
  "HRT-" + Math.random().toString(36).substring(2, 8).toUpperCase();

// --- 3. Component ---
export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "text",
      from: "bot",
      text:
        "🙏 Namaste! Welcome to Heritage India Ticket Booking.\n\nI can help you:\n• Book tickets instantly\n• Explore famous heritage sites\n• Get best prices & offers\n\nHow can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingExternal, setLoadingExternal] = useState(false);

  const [selectedSite, setSelectedSite] = useState(LOCAL_SITES[0]);
  const [ticketType, setTicketType] = useState("indian");
  const [tickets, setTickets] = useState(2);
  const [bookingId, setBookingId] = useState("");

  const isWeekendToday = isWeekend();
  const pricePerTicket =
    ticketType === "indian"
      ? selectedSite.priceIndian
      : selectedSite.priceForeign;
  const baseTotal = pricePerTicket * tickets;
  const offerDiscount = isWeekendToday && tickets >= 2 ? baseTotal * 0.15 : 0;
  const finalTotal = Math.round(baseTotal - offerDiscount);

  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- helpers ---
  const pushMessage = (msg) =>
    setMessages((prev) => [...prev, { id: Date.now(), ...msg }]);

  // --- external search used only when needed ---
  const handleSearchExtraSite = async (query) => {
    setLoadingExternal(true);
    try {
      const results = await searchExternal(query);
      if (!results.length) {
        pushMessage({
          type: "text",
          from: "bot",
          text:
            "Could not find a matching site. Try another name or use the quick buttons.",
        });
        setLoadingExternal(false);
        return;
      }
      const first = results[0];
      const details = await getExternalDetails(first.title);
      if (!details) {
        setLoadingExternal(false);
        return;
      }
      setSelectedSite(details);
      pushMessage({ type: "site-card", site: details });
    } catch (e) {
      pushMessage({
        type: "text",
        from: "bot",
        text: "Some sites may not load right now. Core booking still works.",
      });
    }
    setLoadingExternal(false);
  };

  // --- chat send ---
  const handleSend = () => {
    if (!input.trim()) return;
    const text = input.trim();
    const lower = text.toLowerCase();

    // user bubble
    pushMessage({ type: "text", from: "user", text });

    // if user mentions known local site name, show instantly
    if (lower.includes("hawa mahal")) {
      const site = LOCAL_BY_NAME["hawa mahal"];
      setSelectedSite(site);
      pushMessage({ type: "site-card", site });
    } else if (lower.includes("taj")) {
      const site = LOCAL_BY_NAME["taj mahal"];
      setSelectedSite(site);
      pushMessage({ type: "site-card", site });
    } else if (lower.includes("qutub")) {
      const site = LOCAL_BY_NAME["qutub minar"];
      setSelectedSite(site);
      pushMessage({ type: "site-card", site });
    } else if (
      !lower.includes("book") &&
      !lower.includes("time") &&
      !lower.includes("offer")
    ) {
      // free-text site search for other places only
      handleSearchExtraSite(text);
    }

    setInput("");

    // fake typing for your existing backend
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
    }, 1200);
  };

  const handleBookTickets = () => {
    pushMessage({
      type: "text",
      from: "user",
      text: "I want to book tickets",
    });
    // show quick options
    setTimeout(() => {
      pushMessage({ type: "site-options" });
    }, 800);
  };

  const handleSelectSiteOption = (id) => {
    const site = LOCAL_SITES.find((s) => s.id === id);
    if (!site) return;
    setSelectedSite(site);
    pushMessage({
      type: "text",
      from: "user",
      text: `Show details for ${site.name}`,
    });
    pushMessage({ type: "site-card", site });
  };

  const handleBookNow = () => {
    pushMessage({ type: "booking-summary" });
  };

  const handleConfirmBooking = () => {
    const id = generateBookingId();
    setBookingId(id);
    pushMessage({
      type: "text",
      from: "bot",
      text: `✅ Your booking is confirmed for ${selectedSite.name}. Your booking ID is ${id}.`,
    });
  };

  const handleQuickPill = (type) => {
    if (type === "popular") {
      pushMessage({
        type: "site-options",
      });
    } else if (type === "timings") {
      pushMessage({
        type: "text",
        from: "bot",
        text:
          "General timings:\n• Most monuments: 9:00 AM – 5:30 PM\n• Taj Mahal: 6:00 AM – 7:00 PM (closed Friday)",
      });
    } else if (type === "offers") {
      pushMessage({
        type: "text",
        from: "bot",
        text:
          "Current offers:\n• Weekend Combo: 15% off on 2+ tickets (Sat–Sun)\n• Family Pack: Save on 4+ tickets\n• Student discounts at select sites.",
      });
    }
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ff9933] via-[#ffd47a] to-[#138808] px-4 py-6 relative overflow-hidden flex flex-col items-center">
      {/* subtle bg shapes */}
      <div className="pointer-events-none absolute -left-12 top-20 h-28 w-28 border-4 border-white/30 rounded-3xl rotate-6" />
      <div className="pointer-events-none absolute right-10 bottom-24 h-32 w-32 border-4 border-white/20 rounded-3xl -rotate-12" />

      {/* header */}
      <header className="relative z-10 flex flex-col items-center text-center mb-6 mt-1">
        <span className="text-4xl md:text-5xl font-extrabold text-white leading-none">
          भ
        </span>
        <h1 className="mt-1 text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">
          Heritage India
        </h1>
        <p className="mt-1 text-sm md:text-base text-amber-50">
          ✨ Smart Ticket Booking Assistant
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] md:text-xs">
          <span className="px-3 py-1 rounded-full bg-white/25 text-white shadow-sm">
            🎟️ Instant Booking
          </span>
          <span className="px-3 py-1 rounded-full bg-white/25 text-white shadow-sm">
            🏛️ Famous Sites
          </span>
          <span className="px-3 py-1 rounded-full bg-white/25 text-white shadow-sm">
            💸 Best Prices
          </span>
        </div>
      </header>

      {/* chat card */}
      <div className="relative z-10 w-full max-w-[520px] rounded-3xl bg-[#03263b]/85 backdrop-blur-2xl shadow-[0_26px_90px_rgba(0,0,0,0.6)] border border-sky-900/60">
        {/* top bar */}
        <div className="rounded-t-3xl px-5 py-2.5 flex items-center justify-between bg-[#021623]/90 border-b border-sky-900/60">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl bg-sky-500/20 flex items-center justify-center shadow-md">
              <FaTicketAlt className="text-sky-200 text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-50">
                Heritage India Assistant
              </p>
              <p className="text-[10px] text-emerald-200 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                {isTyping ? "Typing…" : "Online • Instant Booking"}
              </p>
            </div>
          </div>
          {loadingExternal && (
            <span className="text-[10px] text-sky-200">Finding sites…</span>
          )}
        </div>

        {/* chat body */}
        <div className="bg-gradient-to-b from-[#062b45] via-[#041a30] to-[#020915] px-4 pb-4 pt-3 rounded-b-3xl flex flex-col h-[540px]">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.map((msg) => {
              if (msg.type === "text") {
                const isUser = msg.from === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line shadow-md ${
                        isUser
                          ? "bg-gradient-to-r from-[#ff9933] to-[#ff5e62] text-white rounded-br-sm shadow-orange-400/40"
                          : "bg-slate-900/95 text-slate-50 rounded-bl-sm border border-slate-800"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              }

              if (msg.type === "site-card") {
                const site = msg.site;
                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[95%] rounded-3xl bg-slate-900/95 shadow-lg border border-sky-400/40 overflow-hidden">
                      <div className="px-4 pt-4 text-sm text-slate-100">
                        Here are details for{" "}
                        <span className="font-semibold text-amber-300">
                          {site.name}
                        </span>
                        :
                      </div>
                      <div className="px-4 pb-4 pt-2">
                        <div className="relative overflow-hidden rounded-2xl">
                          <img
                            src={site.image}
                            alt={site.name}
                            className="w-full h-44 object-cover"
                            loading="lazy"
                          />
                          <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                            <FaStar className="text-yellow-300" />
                            <span className="font-semibold">
                              {site.rating?.toFixed(1) || "4.5"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 pb-2">
                          <div className="flex items-center justify-between mb-1">
                            <h2 className="text-lg font-semibold text-slate-50">
                              {site.name}
                            </h2>
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/40">
                              <FaUserFriends /> {site.visitors || "Popular"}
                            </span>
                          </div>

                          <div className="flex items-center text-xs text-slate-300 gap-1 mb-1">
                            <FaMapMarkerAlt className="text-sky-300" />
                            <span>{site.city}</span>
                          </div>

                          <p className="text-xs text-slate-400 mb-2">
                            {site.tagline || "Historic landmark and tourist attraction."}
                          </p>

                          <div className="flex items-center text-xs text-slate-300 gap-4 mb-3">
                            <span className="inline-flex items-center gap-1">
                              <FaClock className="text-amber-300" />
                              {site.timings}
                            </span>
                          </div>

                          <div className="flex justify-between items-baseline border-t border-sky-400/40 pt-2 text-sm">
                            <div>
                              <p className="text-xs text-slate-400 mb-0.5">
                                Indian
                              </p>
                              <p className="font-semibold text-emerald-300 flex items-center gap-1">
                                <FaRupeeSign />
                                {site.priceIndian}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-400 mb-0.5">
                                Foreign
                              </p>
                              <p className="font-semibold text-emerald-200 flex items-center gap-1 justify-end">
                                <FaRupeeSign />
                                {site.priceForeign}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-sky-400/40 bg-gradient-to-r from-sky-500/25 via-transparent to-emerald-500/25 px-4 py-3 flex flex-wrap gap-2">
                        <button
                          onClick={handleBookNow}
                          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#ff9933] to-[#ff5e62] text-white text-xs font-semibold shadow-md shadow-orange-400/50"
                        >
                          Book Now
                        </button>
                        <button className="px-3 py-1.5 rounded-full bg-slate-900 text-xs text-slate-100 border border-slate-600 flex items-center gap-1 hover:bg-slate-800">
                          <FaCamera /> View Gallery
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.type === "site-options") {
                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[95%] rounded-3xl bg-slate-900/95 border border-slate-700 px-3 py-2 shadow-md text-[11px] text-slate-100">
                      <p className="mb-1 text-slate-200">
                        Choose a popular site:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleSelectSiteOption("taj")}
                          className="px-3 py-1.5 rounded-full bg-slate-850 border border-slate-600 hover:bg-slate-800 text-slate-50"
                        >
                          Taj Mahal
                        </button>
                        <button
                          onClick={() => handleSelectSiteOption("qutub")}
                          className="px-3 py-1.5 rounded-full bg-slate-850 border border-slate-600 hover:bg-slate-800 text-slate-50"
                        >
                          Qutub Minar
                        </button>
                        <button
                          onClick={() => handleSelectSiteOption("hawa")}
                          className="px-3 py-1.5 rounded-full bg-slate-850 border border-slate-600 hover:bg-slate-800 text-slate-50"
                        >
                          Hawa Mahal
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.type === "booking-summary") {
                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[95%] rounded-3xl bg-slate-900/95 shadow-lg border border-emerald-300/40 p-4 md:p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-200 text-xs font-bold">
                            ₹
                          </span>
                          <h3 className="text-sm font-semibold text-slate-50">
                            Booking Summary
                          </h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div className="space-y-1">
                          <p className="text-slate-400">Selected Site</p>
                          <p className="font-semibold text-slate-50">
                            {selectedSite.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {selectedSite.city}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-slate-400">Visitor Type</p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setTicketType("indian")}
                              className={`flex-1 px-2 py-1 rounded-full border text-[11px] ${
                                ticketType === "indian"
                                  ? "bg-emerald-500 text-white border-emerald-400"
                                  : "bg-slate-900 text-slate-200 border-slate-600"
                              }`}
                            >
                              Indian
                            </button>
                            <button
                              onClick={() => setTicketType("foreign")}
                              className={`flex-1 px-2 py-1 rounded-full border text-[11px] ${
                                ticketType === "foreign"
                                  ? "bg-emerald-500 text-white border-emerald-400"
                                  : "bg-slate-900 text-slate-200 border-slate-600"
                              }`}
                            >
                              Foreign
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-slate-400">Tickets</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setTickets((t) => Math.max(1, t - 1))
                              }
                              className="h-7 w-7 rounded-full border border-slate-600 flex items-center justify-center text-slate-100 text-sm bg-slate-900 hover:bg-slate-800"
                            >
                              -
                            </button>
                            <span className="text-sm font-semibold w-6 text-center text-slate-50">
                              {tickets}
                            </span>
                            <button
                              onClick={() => setTickets((t) => t + 1)}
                              className="h-7 w-7 rounded-full border border-slate-600 flex items-center justify-center text-slate-100 text-sm bg-slate-900 hover:bg-slate-800"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-slate-400">Offer</p>
                          <p className="text-[11px] text-emerald-200">
                            {isWeekendToday
                              ? "Weekend Combo (15% off on 2+ tickets)"
                              : "Best price for today"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-700 pt-2 text-xs space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">
                            Base fare ({tickets} × ₹{pricePerTicket})
                          </span>
                          <span className="font-semibold text-slate-50">
                            ₹{baseTotal}
                          </span>
                        </div>
                        {offerDiscount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-emerald-300 flex items-center gap-1">
                              <FaTag /> Weekend Combo
                            </span>
                            <span className="font-semibold text-emerald-300">
                              -₹{offerDiscount.toFixed(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-slate-400">
                            Amount payable
                          </span>
                          <span className="text-lg font-bold text-slate-50">
                            ₹{finalTotal}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleConfirmBooking}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#ff9933] via-[#ffd47a] to-[#138808] text-slate-950 text-sm font-semibold shadow-md shadow-amber-300/40"
                      >
                        <FaTicketAlt />
                        Confirm Booking
                      </button>

                      {bookingId && (
                        <p className="mt-2 text-[11px] text-emerald-300 text-center">
                          Booking ID:{" "}
                          <span className="font-mono font-semibold">
                            {bookingId}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[60%] rounded-2xl px-3 py-2 bg-slate-900/95 text-slate-50 rounded-bl-sm shadow border border-slate-800 text-sm">
                  <span className="inline-flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:0.3s]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* quick actions */}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <button
              onClick={handleBookTickets}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#ff9933] to-[#ff5e62] text-white border border-amber-300/70 flex items-center gap-1 shadow-md shadow-orange-400/40"
            >
              <FaTicketAlt /> Book Tickets
            </button>
            <button
              onClick={() => handleQuickPill("popular")}
              className="px-3 py-1.5 rounded-full bg-slate-950 text-emerald-100 border border-emerald-400/60 hover:bg-emerald-900/30 transition shadow-sm"
            >
              Popular Sites
            </button>
            <button
              onClick={() => handleQuickPill("timings")}
              className="px-3 py-1.5 rounded-full bg-slate-950 text-amber-100 border border-amber-400/60 hover:bg-amber-900/30 transition shadow-sm"
            >
              Timings & Info
            </button>
            <button
              onClick={() => handleQuickPill("offers")}
              className="px-3 py-1.5 rounded-full bg-slate-950 text-lime-100 border border-lime-400/60 hover:bg-lime-900/30 transition shadow-sm"
            >
              Special Offers
            </button>
          </div>

          {/* input */}
          <div className="mt-3 flex items-center rounded-full bg-slate-950 border border-slate-800 px-3 py-1.5 shadow-inner shadow-black/40">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-transparent text-sm outline-none text-slate-100 placeholder:text-slate-500"
              placeholder="Type a site name or use quick buttons..."
            />
            <button
              onClick={handleSend}
              className="ml-2 h-8 w-8 rounded-full bg-gradient-to-r from-[#ff9933] to-[#ff5e62] text-white flex items-center justify-center shadow-md shadow-orange-400/50 text-xs"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
