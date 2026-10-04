/**
 * Demo: show exactly what the landing-page teardown scrapes from the URLs that
 * the winning ads point to. Mirrors src/lib/scraper/index.ts teardownLandingPage.
 * Run: node --env-file=.env scripts/teardown-demo.mjs
 */
import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

const prisma = new PrismaClient();

const CTA_RE =
  /\b(buy|shop|order|get|start|try|claim|subscribe|add to (cart|bag)|join|grab|unlock|save|build my|get my|start my)\b/i;
const SIGNAL_PATTERNS = [
  [/money[- ]?back|guarantee/i, "money-back guarantee"],
  [/free shipping/i, "free shipping"],
  [/subscribe|subscription|& ?save/i, "subscribe & save"],
  [/\b\d{1,3}\s?% ?off\b|\bdiscount\b|\bsale\b/i, "discount / sale"],
  [/\b[\d,]{2,}\+?\s+(reviews|customers|sold|happy)\b/i, "social-proof counts"],
  [/\brated\b|\bstars?\b|★|⭐/i, "star ratings"],
  [/as seen (in|on)|featured in/i, "press / as-seen-in"],
  [/risk[- ]free|cancel anytime|no commitment/i, "risk reversal"],
  [/\bvs\.?\b|compare|comparison/i, "comparison block"],
  [/\bfaq\b|frequently asked/i, "FAQ"],
];
const collapse = (s) => s.replace(/\s+/g, " ").trim();

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GrowthOSBot/1.0; +https://growthos.app/bot)" },
      redirect: "follow",
    });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseTeardown(html, url) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const title =
    collapse($("title").first().text()) || collapse($('meta[property="og:title"]').attr("content") ?? "");
  const headings = [];
  $("h1, h2, h3").each((_, el) => {
    const t = collapse($(el).text());
    if (t.length >= 3 && t.length <= 120 && !headings.includes(t)) headings.push(t);
  });
  const ctas = [];
  $("a, button").each((_, el) => {
    const t = collapse($(el).text());
    if (t && t.length <= 40 && CTA_RE.test(t) && !ctas.includes(t)) ctas.push(t);
  });
  const bodyText = collapse($("body").text()).slice(0, 30000);
  const signals = SIGNAL_PATTERNS.filter(([re]) => re.test(bodyText)).map(([, label]) => label);
  return { url, title: title || undefined, headings: headings.slice(0, 18), ctas: ctas.slice(0, 8), signals };
}

const ads = await prisma.competitorAd.findMany({
  where: { landingUrl: { not: null } },
  select: { advertiser: true, landingUrl: true, source: true },
  orderBy: { createdAt: "desc" },
  take: 40,
});
const urls = [...new Set(ads.map((a) => a.landingUrl).filter((u) => /^https?:\/\//i.test(u)))].slice(0, 4);

console.log(`\nDB has ${ads.length} ads with a landingUrl. Tearing down ${urls.length} unique pages:\n`);
console.log("Sample of what the ads point to:");
for (const a of ads.slice(0, 8)) console.log(`  - [${a.source}] ${a.advertiser ?? "?"} -> ${a.landingUrl}`);
console.log("\n" + "=".repeat(70));

for (const u of urls) {
  console.log(`\n### ${u}`);
  try {
    const html = await fetchHtml(u);
    const t = parseTeardown(html, u);
    console.log("title   :", t.title);
    console.log("headings:", JSON.stringify(t.headings, null, 0));
    console.log("ctas    :", JSON.stringify(t.ctas));
    console.log("signals :", JSON.stringify(t.signals));
  } catch (e) {
    console.log("FAILED  :", e.message);
  }
}

await prisma.$disconnect();
