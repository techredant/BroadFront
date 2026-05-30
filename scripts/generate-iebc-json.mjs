import fs from "fs";

const SRC =
  process.argv[2] ||
  "C:/Users/Administrator/.cursor/projects/c-BroadCastMobile/agent-tools/4b610975-8c90-4c88-ba5a-3168cc69cabc.txt";
const OUT = new URL("../assets/data/iebc.json", import.meta.url);

const raw = JSON.parse(fs.readFileSync(SRC, "utf8"));

const COUNTY_DISPLAY = {
  MOMBASA: "Mombasa",
  KWALE: "Kwale",
  KILIFI: "Kilifi",
  "TANA RIVER": "Tana River",
  LAMU: "Lamu",
  "TAITA TAVETA": "Taita Taveta",
  GARISSA: "Garissa",
  WAJIR: "Wajir",
  MANDERA: "Mandera",
  MARSABIT: "Marsabit",
  ISIOLO: "Isiolo",
  MERU: "Meru",
  "THARAKA-NITHI": "Tharaka-Nithi",
  EMBU: "Embu",
  KITUI: "Kitui",
  MACHAKOS: "Machakos",
  MAKUENI: "Makueni",
  NYANDARUA: "Nyandarua",
  NYERI: "Nyeri",
  KIRINYAGA: "Kirinyaga",
  "MURANG'A": "Murang'a",
  KIAMBU: "Kiambu",
  TURKANA: "Turkana",
  "WEST POKOT": "West Pokot",
  SAMBURU: "Samburu",
  "TRANS NZOIA": "Trans Nzoia",
  "UASIN GISHU": "Uasin Gishu",
  "ELGEYO/MARAKWET": "Elgeyo-Marakwet",
  NANDI: "Nandi",
  BARINGO: "Baringo",
  LAIKIPIA: "Laikipia",
  NAKURU: "Nakuru",
  NAROK: "Narok",
  KAJIADO: "Kajiado",
  KERICHO: "Kericho",
  BOMET: "Bomet",
  KAKAMEGA: "Kakamega",
  VIHIGA: "Vihiga",
  BUNGOMA: "Bungoma",
  BUSIA: "Busia",
  SIAYA: "Siaya",
  KISUMU: "Kisumu",
  "HOMA BAY": "Homa Bay",
  MIGORI: "Migori",
  KISII: "Kisii",
  NYAMIRA: "Nyamira",
  NAIROBI: "Nairobi",
};

function titleWords(s) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (w.includes("'")) {
        const i = w.indexOf("'");
        const a = w.slice(0, i);
        const b = w.slice(i + 1);
        return `${a.charAt(0).toUpperCase()}${a.slice(1)}'${b ? b.charAt(0).toUpperCase() + b.slice(1) : ""}`;
      }
      if (w.includes("-")) {
        return w
          .split("-")
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join("-");
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function formatSegment(seg) {
  return titleWords(seg.replace(/-/g, " ").trim());
}

function formatName(rawName) {
  if (!rawName) return rawName;
  return rawName
    .split("/")
    .map((part) => formatSegment(part))
    .join("/");
}

function formatConstituencyKey(key) {
  return formatName(key.replace(/-/g, " "));
}

const counties = Object.keys(raw)
  .sort((a, b) => Number(raw[a].County) - Number(raw[b].County))
  .map((countyKey) => {
    const countyCode = Number(raw[countyKey].County);
    const constituencyEntries = Object.entries(raw[countyKey].Constituencies);

    const constituencies = constituencyEntries.map(([cKey, cVal], cIdx) => {
      const code = countyCode * 100 + (cIdx + 1);
      const wards = cVal.Ward.map((w, wIdx) => ({
        name: formatName(w),
        code: code * 100 + (wIdx + 1),
      }));
      return {
        name: formatConstituencyKey(cKey),
        code,
        wards,
      };
    });

    return {
      name: COUNTY_DISPLAY[countyKey] || titleWords(countyKey),
      countyCode,
      constituencies,
    };
  });

const output = {
  source:
    "Independent Electoral and Boundaries Commission (IEBC) — The National Assembly Constituencies and County Assembly Wards Order, 2012 (Legal Notice No. 14 of 2012, Kenya Gazette Vol. CXIV No. 22)",
  constitution:
    "Constitution of Kenya, 2010 — Article 89 (Electoral boundaries) and Fourth Schedule (Distribution of functions between national and county governments). 47 counties, 290 constituencies, 1,450 county assembly wards.",
  counties,
};

fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n");

const stats = counties.reduce(
  (acc, c) => {
    acc.counties++;
    acc.constituencies += c.constituencies.length;
    acc.wards += c.constituencies.reduce((s, co) => s + co.wards.length, 0);
    return acc;
  },
  { counties: 0, constituencies: 0, wards: 0 },
);

console.log(stats);
