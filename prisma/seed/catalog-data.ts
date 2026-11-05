/* Demo catalogue for the seed script. All brands and products are fictional. */
import type { PlaceholderKind } from "../../src/lib/placeholder";

export type Tr = [cs: string, en: string];

export type CategorySeed = {
  key: string;
  icon: string;
  cs: [name: string, slug: string];
  en: [name: string, slug: string];
  descr?: Tr;
  children?: CategorySeed[];
};

export const CATEGORIES: CategorySeed[] = [
  {
    key: "phones-tablets",
    icon: "smartphone",
    cs: ["Telefony a tablety", "telefony-a-tablety"],
    en: ["Phones & tablets", "phones-tablets"],
    children: [
      { key: "smartphones", icon: "smartphone", cs: ["Chytré telefony", "chytre-telefony"], en: ["Smartphones", "smartphones"], descr: ["Chytré telefony od kompaktních modelů po vlajkové lodě s nejlepšími fotoaparáty.", "Smartphones from compact models to flagships with the best cameras."] },
      { key: "tablets", icon: "tablet", cs: ["Tablety", "tablety"], en: ["Tablets", "tablets"], descr: ["Tablety na práci, studium i večerní seriály.", "Tablets for work, study and evening shows."] },
    ],
  },
  {
    key: "computers",
    icon: "laptop",
    cs: ["Notebooky a počítače", "notebooky-a-pocitace"],
    en: ["Laptops & computers", "laptops-computers"],
    children: [
      { key: "laptops", icon: "laptop", cs: ["Notebooky", "notebooky"], en: ["Laptops", "laptops"], descr: ["Lehké ultrabooky, výkonné pracovní stroje i herní notebooky.", "Light ultrabooks, powerful workstations and gaming laptops."] },
      { key: "monitors", icon: "monitor", cs: ["Monitory", "monitory"], en: ["Monitors", "monitors"], descr: ["Monitory pro kancelář, grafiku i hraní.", "Monitors for the office, design work and gaming."] },
    ],
  },
  {
    key: "tv-video",
    icon: "tv",
    cs: ["Televize a video", "televize-a-video"],
    en: ["TV & video", "tv-video"],
    children: [
      { key: "tvs", icon: "tv", cs: ["Televize", "televize"], en: ["Televisions", "televisions"], descr: ["OLED a QLED televize s chytrými funkcemi.", "OLED and QLED televisions with smart features."] },
      { key: "streaming", icon: "cast", cs: ["Multimediální přehrávače", "multimedialni-prehravace"], en: ["Streaming devices", "streaming-devices"], descr: ["Udělejte z každé televize chytrou.", "Turn any TV into a smart one."] },
    ],
  },
  {
    key: "audio",
    icon: "headphones",
    cs: ["Audio", "audio"],
    en: ["Audio", "audio"],
    children: [
      { key: "headphones", icon: "headphones", cs: ["Sluchátka", "sluchatka"], en: ["Headphones", "headphones"], descr: ["Sluchátka přes uši i do uší, s potlačením hluku i bez.", "Over-ear and in-ear headphones, with or without noise cancelling."] },
      { key: "speakers", icon: "speaker", cs: ["Reproduktory", "reproduktory"], en: ["Speakers", "speakers"], descr: ["Přenosné i domácí reproduktory.", "Portable and home speakers."] },
    ],
  },
  {
    key: "wearables",
    icon: "watch",
    cs: ["Chytré hodinky a náramky", "chytre-hodinky-a-naramky"],
    en: ["Smart watches & wearables", "smart-watches-wearables"],
    children: [
      { key: "smartwatches", icon: "watch", cs: ["Chytré hodinky", "chytre-hodinky"], en: ["Smart watches", "smart-watches"], descr: ["Hodinky, které hlídají zdraví, trénink i notifikace.", "Watches that track health, training and notifications."] },
      { key: "fitness", icon: "activity", cs: ["Fitness náramky", "fitness-naramky"], en: ["Fitness trackers", "fitness-trackers"], descr: ["Lehké náramky s dlouhou výdrží.", "Lightweight trackers with long battery life."] },
    ],
  },
  {
    key: "gaming",
    icon: "gamepad-2",
    cs: ["Herní svět", "herni-svet"],
    en: ["Gaming", "gaming"],
    children: [
      { key: "consoles", icon: "gamepad-2", cs: ["Herní konzole", "herni-konzole"], en: ["Consoles", "consoles"], descr: ["Domácí i kapesní herní konzole.", "Home and handheld game consoles."] },
      { key: "gaming-accessories", icon: "joystick", cs: ["Ovladače a příslušenství", "ovladace-a-prislusenstvi"], en: ["Controllers & accessories", "controllers-accessories"], descr: ["Ovladače, dokovací stanice a další vybavení.", "Controllers, docks and more gear."] },
    ],
  },
  {
    key: "components",
    icon: "cpu",
    cs: ["PC komponenty", "pc-komponenty"],
    en: ["PC components", "pc-components"],
    children: [
      { key: "gpus", icon: "cpu", cs: ["Grafické karty", "graficke-karty"], en: ["Graphics cards", "graphics-cards"], descr: ["Grafické karty pro hraní i tvorbu.", "Graphics cards for gaming and creative work."] },
      { key: "ssd", icon: "hard-drive", cs: ["Disky SSD", "disky-ssd"], en: ["SSD drives", "ssd-drives"], descr: ["Rychlé interní i přenosné disky.", "Fast internal and portable drives."] },
    ],
  },
  {
    key: "accessories",
    icon: "cable",
    cs: ["Příslušenství", "prislusenstvi"],
    en: ["Accessories", "accessories"],
    children: [
      { key: "power", icon: "battery-charging", cs: ["Nabíječky a powerbanky", "nabijecky-a-powerbanky"], en: ["Chargers & power banks", "chargers-power-banks"], descr: ["Energie na cesty i domů.", "Power on the go and at home."] },
      { key: "peripherals", icon: "keyboard", cs: ["Klávesnice a myši", "klavesnice-a-mysi"], en: ["Keyboards & mice", "keyboards-mice"], descr: ["Klávesnice a myši pro práci i hraní.", "Keyboards and mice for work and play."] },
    ],
  },
];

export const BRANDS: Array<{ slug: string; name: string; code: string; website?: string }> = [
  { slug: "nordvik", name: "Nordvik", code: "NV" },
  { slug: "kestrel", name: "Kestrel", code: "KS" },
  { slug: "orbis", name: "Orbis", code: "OB" },
  { slug: "lumetra", name: "Lumetra", code: "LM" },
  { slug: "vexa", name: "Vexa", code: "VX" },
  { slug: "solenne", name: "Solenne", code: "SL" },
  { slug: "tessaro", name: "Tessaro", code: "TS" },
  { slug: "halvo", name: "Halvo", code: "HV" },
  { slug: "quill", name: "Quill", code: "QL" },
  { slug: "moravo", name: "Moravo", code: "MR" },
];

export type SpecSeed = {
  key: string;
  type: "NUMBER" | "TEXT" | "BOOLEAN";
  unit?: string | Tr;
  filterable?: boolean;
  isKey?: boolean;
  label: Tr;
};

const s = (
  key: string,
  type: SpecSeed["type"],
  label: Tr,
  opts: { unit?: string | Tr; f?: boolean; k?: boolean } = {},
): SpecSeed => ({ key, type, label, unit: opts.unit, filterable: opts.f, isKey: opts.k });

const DISPLAY = s("display", "NUMBER", ["Úhlopříčka displeje", "Screen size"], { unit: "″", f: true, k: true });
const OS = s("os", "TEXT", ["Operační systém", "Operating system"], { f: true });
const RAM = s("ram", "NUMBER", ["Operační paměť", "RAM"], { unit: "GB", f: true, k: true });
const BATTERY_MAH = s("battery", "NUMBER", ["Kapacita baterie", "Battery capacity"], { unit: "mAh", f: true });
const WIRELESS = s("wireless", "BOOLEAN", ["Bezdrátové", "Wireless"], { f: true, k: true });

export const SPECS: Record<string, SpecSeed[]> = {
  smartphones: [
    DISPLAY,
    s("display_type", "TEXT", ["Typ displeje", "Display type"], { f: true }),
    s("chipset", "TEXT", ["Procesor", "Chipset"], { k: true }),
    RAM,
    s("camera", "NUMBER", ["Hlavní fotoaparát", "Main camera"], { unit: "Mpx", k: true }),
    BATTERY_MAH,
    OS,
    s("nfc", "BOOLEAN", ["NFC", "NFC"], { f: true }),
    s("five_g", "BOOLEAN", ["Podpora 5G", "5G support"], { f: true }),
  ],
  tablets: [DISPLAY, RAM, BATTERY_MAH, { ...OS, isKey: true }, s("cellular", "BOOLEAN", ["Mobilní data", "Cellular"], { f: true }), s("stylus", "BOOLEAN", ["Podpora stylusu", "Stylus support"], { f: true })],
  laptops: [
    DISPLAY,
    s("cpu", "TEXT", ["Procesor", "Processor"], { f: true, k: true }),
    RAM,
    s("ssd", "NUMBER", ["Kapacita SSD", "SSD capacity"], { unit: "GB", f: true, k: true }),
    s("gpu", "TEXT", ["Grafická karta", "Graphics"], { k: true }),
    s("weight", "NUMBER", ["Hmotnost", "Weight"], { unit: "kg" }),
    OS,
    s("battery_life", "NUMBER", ["Výdrž baterie", "Battery life"], { unit: "h" }),
  ],
  monitors: [
    DISPLAY,
    s("resolution", "TEXT", ["Rozlišení", "Resolution"], { f: true, k: true }),
    s("refresh", "NUMBER", ["Obnovovací frekvence", "Refresh rate"], { unit: "Hz", f: true, k: true }),
    s("panel", "TEXT", ["Typ panelu", "Panel type"], { f: true }),
    s("response", "NUMBER", ["Doba odezvy", "Response time"], { unit: "ms" }),
  ],
  tvs: [
    DISPLAY,
    s("resolution", "TEXT", ["Rozlišení", "Resolution"], { f: true, k: true }),
    s("panel", "TEXT", ["Technologie panelu", "Panel technology"], { f: true, k: true }),
    s("refresh", "NUMBER", ["Obnovovací frekvence", "Refresh rate"], { unit: "Hz", f: true }),
    s("smart_os", "TEXT", ["Chytrá platforma", "Smart platform"], { f: true }),
    s("hdr", "TEXT", ["Formáty HDR", "HDR formats"]),
  ],
  streaming: [
    s("resolution", "TEXT", ["Max. rozlišení", "Max resolution"], { f: true, k: true }),
    { ...OS, isKey: true },
    s("voice_remote", "BOOLEAN", ["Hlasový ovladač", "Voice remote"], { f: true }),
    s("hdr", "TEXT", ["Formáty HDR", "HDR formats"]),
  ],
  headphones: [
    s("form", "TEXT", ["Konstrukce", "Form factor"], { f: true, k: true }),
    s("anc", "BOOLEAN", ["Aktivní potlačení hluku", "Active noise cancelling"], { f: true, k: true }),
    WIRELESS,
    s("battery_life", "NUMBER", ["Výdrž baterie", "Battery life"], { unit: "h", f: true, k: true }),
    s("weight", "NUMBER", ["Hmotnost", "Weight"], { unit: "g" }),
  ],
  speakers: [
    s("power", "NUMBER", ["Výkon", "Output power"], { unit: "W", f: true, k: true }),
    s("ip_rating", "TEXT", ["Odolnost", "Ingress protection"], { f: true, k: true }),
    s("battery_life", "NUMBER", ["Výdrž baterie", "Battery life"], { unit: "h" }),
    s("stereo_pair", "BOOLEAN", ["Párování do sterea", "Stereo pairing"], { f: true }),
  ],
  smartwatches: [
    s("case_size", "NUMBER", ["Velikost pouzdra", "Case size"], { unit: "mm", f: true, k: true }),
    s("gps", "BOOLEAN", ["GPS", "GPS"], { f: true, k: true }),
    s("battery_days", "NUMBER", ["Výdrž baterie", "Battery life"], { unit: ["dní", "days"], f: true, k: true }),
    s("water", "TEXT", ["Voděodolnost", "Water resistance"], { k: true }),
    { ...OS },
  ],
  fitness: [
    s("battery_days", "NUMBER", ["Výdrž baterie", "Battery life"], { unit: ["dní", "days"], f: true, k: true }),
    s("heart_rate", "BOOLEAN", ["Měření tepu", "Heart-rate sensor"], { f: true, k: true }),
    s("display_type", "TEXT", ["Typ displeje", "Display type"]),
    s("water", "TEXT", ["Voděodolnost", "Water resistance"]),
  ],
  consoles: [
    s("storage", "NUMBER", ["Úložiště", "Storage"], { unit: "GB", f: true, k: true }),
    s("max_resolution", "TEXT", ["Max. rozlišení", "Max resolution"], { f: true, k: true }),
    s("disc_drive", "BOOLEAN", ["Optická mechanika", "Disc drive"], { f: true }),
    s("handheld", "BOOLEAN", ["Kapesní provedení", "Handheld"], { f: true }),
  ],
  "gaming-accessories": [
    s("platform", "TEXT", ["Platforma", "Platform"], { f: true, k: true }),
    WIRELESS,
    s("battery_life", "NUMBER", ["Výdrž baterie", "Battery life"], { unit: "h" }),
  ],
  gpus: [
    s("vram", "NUMBER", ["Grafická paměť", "Video memory"], { unit: "GB", f: true, k: true }),
    s("memory_type", "TEXT", ["Typ paměti", "Memory type"], { f: true }),
    s("tdp", "NUMBER", ["Příkon (TDP)", "Power draw (TDP)"], { unit: "W", k: true }),
    s("outputs", "TEXT", ["Výstupy", "Outputs"]),
    s("length", "NUMBER", ["Délka karty", "Card length"], { unit: "mm" }),
  ],
  ssd: [
    s("interface", "TEXT", ["Rozhraní", "Interface"], { f: true, k: true }),
    s("read_speed", "NUMBER", ["Rychlost čtení", "Read speed"], { unit: "MB/s", f: true, k: true }),
    s("write_speed", "NUMBER", ["Rychlost zápisu", "Write speed"], { unit: "MB/s" }),
    s("form_factor", "TEXT", ["Formát", "Form factor"], { f: true }),
  ],
  power: [
    s("power_w", "NUMBER", ["Výkon nabíjení", "Charging power"], { unit: "W", f: true, k: true }),
    s("capacity", "NUMBER", ["Kapacita", "Capacity"], { unit: "mAh", f: true, k: true }),
    s("ports", "NUMBER", ["Počet portů", "Ports"], { k: true }),
    s("gan", "BOOLEAN", ["Technologie GaN", "GaN technology"], { f: true }),
  ],
  peripherals: [
    s("device_type", "TEXT", ["Typ zařízení", "Device type"], { f: true, k: true }),
    WIRELESS,
    s("layout", "TEXT", ["Rozložení", "Layout"], { f: true }),
    s("dpi", "NUMBER", ["Rozlišení senzoru", "Sensor resolution"], { unit: "DPI" }),
  ],
};

export type Color = [value: string, cs: string, en: string, hex: string];
export const C = {
  black: ["black", "Černá", "Black", "1f2125"],
  white: ["white", "Bílá", "White", "eeeae3"],
  silver: ["silver", "Stříbrná", "Silver", "c9ccd1"],
  blue: ["blue", "Modrá", "Blue", "3e6b8a"],
  green: ["green", "Zelená", "Green", "5e7d63"],
  sand: ["sand", "Písková", "Sand", "d8c3a5"],
  graphite: ["graphite", "Grafitová", "Graphite", "4a4e55"],
  red: ["red", "Červená", "Red", "a8463d"],
  lilac: ["lilac", "Levandulová", "Lavender", "b7a6c9"],
} satisfies Record<string, Color>;

export type OptionValue = [value: string, cs: string, en: string, priceDeltaCzk: number];

export type SpecValueSeed = number | boolean | string | Tr;

export type ProductSeed = {
  cat: string;
  brand: string;
  kind: PlaceholderKind;
  name: string;
  code: string;
  short: Tr;
  price: number;
  /** previous price (CZK major units) — creates a discount */
  old?: number;
  colors: Color[];
  option?: { name: "storage" | "memory" | "size" | "connectivity" | "edition"; values: OptionValue[] };
  specs: Record<string, SpecValueSeed>;
  badges?: string[];
  featured?: boolean;
  sold: number;
  /** created N days ago (drives "new arrivals") */
  age: number;
  highlight: Tr;
};

const GB = (v: number, delta: number): OptionValue => [`${v}gb`, `${v} GB`, `${v} GB`, delta];
const TB = (v: number, delta: number): OptionValue => [`${v}tb`, `${v} TB`, `${v} TB`, delta];

export const PRODUCTS: ProductSeed[] = [
  // Smartphones
  { cat: "smartphones", brand: "nordvik", kind: "phone", name: "Nordvik Aurora 8", code: "AUR8", short: ["Vyvážený telefon s 6,4″ OLED displejem a dvoudenní výdrží.", "A balanced phone with a 6.4″ OLED display and two-day battery life."], price: 12990, old: 14490, colors: [C.black, C.green, C.sand], option: { name: "storage", values: [GB(128, 0), GB(256, 2000)] }, specs: { display: 6.4, display_type: ["OLED", "OLED"], chipset: "Halcyon 7 Gen 3", ram: 8, camera: 50, battery: 5000, os: "Android 16", nfc: true, five_g: true }, badges: ["sale", "bestseller"], featured: true, sold: 412, age: 120, highlight: ["dvoudenní výdrž baterie", "two-day battery life"] },
  { cat: "smartphones", brand: "nordvik", kind: "phone", name: "Nordvik Aurora 8 Pro", code: "AUR8P", short: ["Vlajková loď s trojitým fotoaparátem a 120Hz displejem.", "Flagship with a triple camera and a 120 Hz display."], price: 24990, colors: [C.graphite, C.silver, C.lilac], option: { name: "storage", values: [GB(256, 0), GB(512, 3000), TB(1, 7000)] }, specs: { display: 6.7, display_type: ["LTPO OLED", "LTPO OLED"], chipset: "Halcyon 9 Gen 4", ram: 12, camera: 200, battery: 5200, os: "Android 16", nfc: true, five_g: true }, badges: ["new"], featured: true, sold: 188, age: 6, highlight: ["fotoaparát s rozlišením 200 Mpx", "a 200 MP main camera"] },
  { cat: "smartphones", brand: "kestrel", kind: "phone", name: "Kestrel K5", code: "K5", short: ["Dostupný telefon pro každý den s velkou baterií.", "An affordable everyday phone with a big battery."], price: 4490, old: 4990, colors: [C.blue, C.black], option: { name: "storage", values: [GB(64, 0), GB(128, 600)] }, specs: { display: 6.6, display_type: ["LCD", "LCD"], chipset: "Tern A15", ram: 4, camera: 50, battery: 6000, os: "Android 15", nfc: true, five_g: false }, badges: ["sale"], sold: 520, age: 210, highlight: ["baterie 6 000 mAh", "a 6,000 mAh battery"] },
  { cat: "smartphones", brand: "orbis", kind: "phone", name: "Orbis One Mini", code: "ONEM", short: ["Kompaktní telefon, který se vejde do každé kapsy.", "A compact phone that fits any pocket."], price: 15990, colors: [C.white, C.red, C.black], option: { name: "storage", values: [GB(128, 0), GB(256, 2500)] }, specs: { display: 5.9, display_type: ["OLED", "OLED"], chipset: "Orbis O3", ram: 8, camera: 48, battery: 4100, os: "OrbisOS 6", nfc: true, five_g: true }, badges: ["tip"], sold: 140, age: 60, highlight: ["kompaktní tělo s displejem 5,9″", "a compact body with a 5.9″ screen"] },
  { cat: "smartphones", brand: "vexa", kind: "phone", name: "Vexa Neo 12", code: "NEO12", short: ["Herní telefon s chlazením a 144Hz displejem.", "A gaming phone with active cooling and a 144 Hz display."], price: 18490, colors: [C.black, C.blue], option: { name: "storage", values: [GB(256, 0), GB(512, 2500)] }, specs: { display: 6.8, display_type: ["AMOLED", "AMOLED"], chipset: "Halcyon 9 Gen 3", ram: 16, camera: 64, battery: 5500, os: "Android 16", nfc: true, five_g: true }, badges: ["new"], sold: 75, age: 12, highlight: ["displej se 144 Hz", "a 144 Hz display"] },
  // Tablets
  { cat: "tablets", brand: "nordvik", kind: "tablet", name: "Nordvik Slate 11", code: "SLT11", short: ["11″ tablet na práci i zábavu s podporou stylusu.", "An 11″ tablet for work and play with stylus support."], price: 9990, colors: [C.graphite, C.silver], option: { name: "connectivity", values: [["wifi", "Wi-Fi", "Wi-Fi", 0], ["lte", "Wi-Fi + LTE", "Wi-Fi + LTE", 2000]] }, specs: { display: 11, ram: 6, battery: 8000, os: "Android 16", cellular: true, stylus: true }, badges: ["bestseller"], sold: 230, age: 90, highlight: ["podpora stylusu", "stylus support"] },
  { cat: "tablets", brand: "orbis", kind: "tablet", name: "Orbis Pad Air", code: "PADA", short: ["Tenký a lehký tablet s brilantním displejem.", "A thin and light tablet with a brilliant display."], price: 16990, old: 18990, colors: [C.lilac, C.silver, C.blue], option: { name: "storage", values: [GB(128, 0), GB(256, 3000)] }, specs: { display: 10.9, ram: 8, battery: 7600, os: "OrbisOS 6", cellular: false, stylus: true }, badges: ["sale"], featured: true, sold: 150, age: 70, highlight: ["hmotnost pouhých 460 g", "a weight of just 460 g"] },
  { cat: "tablets", brand: "kestrel", kind: "tablet", name: "Kestrel Tab 10 Lite", code: "TAB10", short: ["Rodinný tablet za skvělou cenu.", "A family tablet at a great price."], price: 3990, colors: [C.graphite], specs: { display: 10.1, ram: 4, battery: 6000, os: "Android 15", cellular: false, stylus: false }, sold: 310, age: 300, highlight: ["rodičovská kontrola", "parental controls"] },
  // Laptops
  { cat: "laptops", brand: "lumetra", kind: "laptop", name: "Lumetra Book 14", code: "BK14", short: ["Lehký 14″ notebook s celodenní výdrží.", "A light 14″ laptop with all-day battery life."], price: 21990, old: 23990, colors: [C.silver, C.graphite], option: { name: "memory", values: [["16gb-512", "16 GB / 512 GB", "16 GB / 512 GB", 0], ["32gb-1tb", "32 GB / 1 TB", "32 GB / 1 TB", 6000]] }, specs: { display: 14, cpu: "Lumetra L7 8-core", ram: 16, ssd: 512, gpu: ["Integrovaná", "Integrated"], weight: 1.2, os: "Windows 11", battery_life: 18 }, badges: ["sale", "bestseller"], featured: true, sold: 260, age: 80, highlight: ["výdrž až 18 hodin", "up to 18 hours of battery life"] },
  { cat: "laptops", brand: "lumetra", kind: "laptop", name: "Lumetra Book Pro 16", code: "BK16P", short: ["Výkonný 16″ stroj pro tvůrce.", "A powerful 16″ machine for creators."], price: 54990, colors: [C.graphite, C.silver], option: { name: "memory", values: [["32gb-1tb", "32 GB / 1 TB", "32 GB / 1 TB", 0], ["64gb-2tb", "64 GB / 2 TB", "64 GB / 2 TB", 18000]] }, specs: { display: 16, cpu: "Lumetra L9 14-core", ram: 32, ssd: 1024, gpu: "Tessaro Forge M8", weight: 2.1, os: "Windows 11 Pro", battery_life: 14 }, badges: ["new"], sold: 64, age: 15, highlight: ["kalibrovaný displej 3,2K", "a calibrated 3.2K display"] },
  { cat: "laptops", brand: "vexa", kind: "laptop", name: "Vexa Blade 15", code: "BLD15", short: ["Herní notebook s 240Hz displejem.", "A gaming laptop with a 240 Hz display."], price: 39990, old: 44990, colors: [C.black], option: { name: "memory", values: [["16gb-1tb", "16 GB / 1 TB", "16 GB / 1 TB", 0], ["32gb-2tb", "32 GB / 2 TB", "32 GB / 2 TB", 8000]] }, specs: { display: 15.6, cpu: "Vertex V9 16-core", ram: 16, ssd: 1024, gpu: "Tessaro Forge G7", weight: 2.4, os: "Windows 11", battery_life: 7 }, badges: ["sale"], sold: 98, age: 140, highlight: ["displej s frekvencí 240 Hz", "a 240 Hz display"] },
  { cat: "laptops", brand: "tessaro", kind: "laptop", name: "Tessaro Air 13", code: "AIR13", short: ["Ultrabook pod kilogram.", "An ultrabook under one kilogram."], price: 26990, colors: [C.sand, C.silver], specs: { display: 13.3, cpu: "Vertex V5 8-core", ram: 16, ssd: 512, gpu: ["Integrovaná", "Integrated"], weight: 0.98, os: "Windows 11", battery_life: 16 }, sold: 54, age: 40, highlight: ["hmotnost 980 g", "a weight of 980 g"] },
  // Monitors
  { cat: "monitors", brand: "lumetra", kind: "monitor", name: "Lumetra View 27 QHD", code: "V27", short: ["27″ IPS monitor s věrnými barvami.", "A 27″ IPS monitor with accurate colours."], price: 7490, colors: [C.black, C.white], specs: { display: 27, resolution: "2560 × 1440", refresh: 100, panel: "IPS", response: 4 }, badges: ["tip"], sold: 175, age: 160, highlight: ["pokrytí 99 % sRGB", "99% sRGB coverage"] },
  { cat: "monitors", brand: "vexa", kind: "monitor", name: "Vexa Arena 32", code: "AR32", short: ["Zakřivený herní monitor se 165 Hz.", "A curved 165 Hz gaming monitor."], price: 9990, old: 11990, colors: [C.black], specs: { display: 31.5, resolution: "2560 × 1440", refresh: 165, panel: "VA", response: 1 }, badges: ["sale"], sold: 120, age: 100, highlight: ["odezva 1 ms", "1 ms response time"] },
  // TVs
  { cat: "tvs", brand: "solenne", kind: "tv", name: "Solenne Vista 55 OLED", code: "VS55", short: ["OLED televize s dokonalou černou.", "An OLED TV with perfect blacks."], price: 32990, old: 36990, colors: [C.graphite], option: { name: "size", values: [["55", "55″", "55″", 0], ["65", "65″", "65″", 12000]] }, specs: { display: 55, resolution: "4K Ultra HD", panel: "OLED", refresh: 120, smart_os: "Solenne Home", hdr: "HDR10, HLG, Dolby Vision" }, badges: ["sale", "bestseller"], featured: true, sold: 140, age: 75, highlight: ["obraz OLED se 120 Hz", "a 120 Hz OLED picture"] },
  { cat: "tvs", brand: "solenne", kind: "tv", name: "Solenne Vista 65 QLED", code: "VS65Q", short: ["Velká QLED televize do obýváku.", "A big QLED TV for the living room."], price: 22990, colors: [C.black], specs: { display: 65, resolution: "4K Ultra HD", panel: "QLED", refresh: 60, smart_os: "Solenne Home", hdr: "HDR10, HLG" }, sold: 90, age: 200, highlight: ["kvantové tečky", "quantum-dot colour"] },
  { cat: "tvs", brand: "orbis", kind: "tv", name: "Orbis Frame 43", code: "FR43", short: ["Kompaktní chytrá TV do ložnice i kuchyně.", "A compact smart TV for the bedroom or kitchen."], price: 8990, colors: [C.white, C.black], specs: { display: 43, resolution: "4K Ultra HD", panel: "LED", refresh: 60, smart_os: "OrbisOS TV", hdr: "HDR10" }, badges: ["new"], sold: 45, age: 9, highlight: ["tenký rámeček", "a slim bezel"] },
  // Streaming
  { cat: "streaming", brand: "orbis", kind: "streamer", name: "Orbis Stream 4K", code: "ST4K", short: ["4K přehrávač s hlasovým ovladačem.", "A 4K streamer with a voice remote."], price: 1790, colors: [C.black], specs: { resolution: "4K", os: "OrbisOS TV", voice_remote: true, hdr: "HDR10+, Dolby Vision" }, badges: ["bestseller"], sold: 380, age: 260, highlight: ["podpora Dolby Vision", "Dolby Vision support"] },
  { cat: "streaming", brand: "solenne", kind: "streamer", name: "Solenne Cast Mini", code: "CSTM", short: ["Malý přehrávač do HDMI.", "A tiny HDMI streaming stick."], price: 990, old: 1290, colors: [C.white], specs: { resolution: "Full HD", os: "Solenne Home", voice_remote: false, hdr: "HDR10" }, badges: ["sale"], sold: 260, age: 330, highlight: ["instalace za minutu", "one-minute setup"] },
  // Headphones
  { cat: "headphones", brand: "halvo", kind: "headphones", name: "Halvo Studio ANC", code: "STANC", short: ["Sluchátka přes uši s adaptivním potlačením hluku.", "Over-ear headphones with adaptive noise cancelling."], price: 7990, old: 9490, colors: [C.black, C.sand, C.blue], specs: { form: ["Přes uši", "Over-ear"], anc: true, wireless: true, battery_life: 40, weight: 250 }, badges: ["sale", "bestseller"], featured: true, sold: 450, age: 110, highlight: ["výdrž 40 hodin", "40 hours of playback"] },
  { cat: "headphones", brand: "halvo", kind: "earbuds", name: "Halvo Buds Pro", code: "BUDSP", short: ["Malá sluchátka do uší s velkým zvukem.", "Small in-ear buds with big sound."], price: 4490, colors: [C.white, C.black], specs: { form: ["Do uší", "In-ear"], anc: true, wireless: true, battery_life: 30, weight: 48 }, badges: ["new"], sold: 300, age: 20, highlight: ["prostorový zvuk", "spatial audio"] },
  { cat: "headphones", brand: "kestrel", kind: "earbuds", name: "Kestrel Pods Lite", code: "PODL", short: ["Bezdrátová sluchátka za skvělou cenu.", "Wireless earbuds at a great price."], price: 990, colors: [C.white, C.lilac, C.green], specs: { form: ["Do uší", "In-ear"], anc: false, wireless: true, battery_life: 24, weight: 40 }, sold: 640, age: 240, highlight: ["rychlé párování", "instant pairing"] },
  { cat: "headphones", brand: "moravo", kind: "headphones", name: "Moravo Classic Wired", code: "CLW", short: ["Kabelová studiová sluchátka.", "Wired studio headphones."], price: 2290, colors: [C.black], specs: { form: ["Přes uši", "Over-ear"], anc: false, wireless: false, battery_life: 0, weight: 290 }, badges: ["tip"], sold: 80, age: 400, highlight: ["neutrální studiový zvuk", "a neutral studio sound"] },
  // Speakers
  { cat: "speakers", brand: "halvo", kind: "speaker", name: "Halvo Boom Go", code: "BOOMG", short: ["Odolný přenosný reproduktor.", "A rugged portable speaker."], price: 2490, old: 2990, colors: [C.blue, C.red, C.black], specs: { power: 20, ip_rating: "IP67", battery_life: 16, stereo_pair: true }, badges: ["sale"], sold: 330, age: 150, highlight: ["odolnost IP67", "IP67 protection"] },
  { cat: "speakers", brand: "halvo", kind: "speaker", name: "Halvo Room 2", code: "ROOM2", short: ["Chytrý domácí reproduktor s Wi-Fi.", "A smart Wi-Fi home speaker."], price: 5990, colors: [C.sand, C.graphite], specs: { power: 60, ip_rating: ["Bez krytí", "None"], battery_life: 0, stereo_pair: true }, badges: ["new"], sold: 70, age: 18, highlight: ["multiroom přes Wi-Fi", "Wi-Fi multiroom"] },
  { cat: "speakers", brand: "quill", kind: "speaker", name: "Quill Pebble", code: "PBL", short: ["Kapesní reproduktor s poutkem.", "A pocket speaker with a strap."], price: 790, colors: [C.lilac, C.green, C.sand], specs: { power: 5, ip_rating: "IP54", battery_life: 10, stereo_pair: false }, sold: 210, age: 280, highlight: ["hmotnost 180 g", "a weight of 180 g"] },
  // Smart watches
  { cat: "smartwatches", brand: "nordvik", kind: "watch", name: "Nordvik Watch 4", code: "W4", short: ["Elegantní hodinky s EKG a GPS.", "An elegant watch with ECG and GPS."], price: 7490, colors: [C.black, C.silver], option: { name: "size", values: [["41mm", "41 mm", "41 mm", 0], ["45mm", "45 mm", "45 mm", 800]] }, specs: { case_size: 41, gps: true, battery_days: 3, water: "5 ATM", os: "Nordvik Wear" }, badges: ["bestseller"], featured: true, sold: 280, age: 95, highlight: ["měření EKG", "ECG measurement"] },
  { cat: "smartwatches", brand: "orbis", kind: "watch", name: "Orbis Watch Active", code: "WACT", short: ["Sportovní hodinky s dvoutýdenní výdrží.", "Sports watch with two-week battery life."], price: 5490, old: 5990, colors: [C.green, C.black, C.sand], specs: { case_size: 46, gps: true, battery_days: 14, water: "10 ATM", os: "OrbisOS Wear" }, badges: ["sale"], sold: 160, age: 55, highlight: ["výdrž až 14 dní", "up to 14 days of battery"] },
  { cat: "smartwatches", brand: "kestrel", kind: "watch", name: "Kestrel Watch S", code: "WS", short: ["Chytré hodinky do každé kapsy.", "Smart watch for every budget."], price: 1990, colors: [C.black, C.lilac], specs: { case_size: 42, gps: false, battery_days: 10, water: "IP68", os: "Kestrel OS" }, sold: 350, age: 190, highlight: ["více než 100 sportovních režimů", "100+ sport modes"] },
  // Fitness
  { cat: "fitness", brand: "kestrel", kind: "band", name: "Kestrel Band 7", code: "BND7", short: ["Fitness náramek s AMOLED displejem.", "A fitness tracker with an AMOLED display."], price: 990, colors: [C.black, C.blue, C.lilac], specs: { battery_days: 16, heart_rate: true, display_type: ["AMOLED", "AMOLED"], water: "5 ATM" }, badges: ["bestseller"], sold: 700, age: 170, highlight: ["výdrž 16 dní", "16 days of battery"] },
  { cat: "fitness", brand: "orbis", kind: "band", name: "Orbis Fit Lite", code: "FITL", short: ["Nenápadný náramek na spánek i kroky.", "A subtle tracker for sleep and steps."], price: 690, colors: [C.sand, C.black], specs: { battery_days: 21, heart_rate: true, display_type: ["OLED", "OLED"], water: "5 ATM" }, badges: ["new"], sold: 120, age: 25, highlight: ["sledování spánku", "sleep tracking"] },
  // Consoles
  { cat: "consoles", brand: "vexa", kind: "console", name: "Vexa Station X", code: "STX", short: ["Herní konzole nové generace s 4K a 120 fps.", "A next-gen console with 4K at 120 fps."], price: 13990, old: 14990, colors: [C.white, C.black], option: { name: "edition", values: [["digital", "Digitální edice", "Digital edition", 0], ["disc", "Edice s mechanikou", "Disc edition", 2000]] }, specs: { storage: 1000, max_resolution: "4K", disc_drive: true, handheld: false }, badges: ["sale", "bestseller"], featured: true, sold: 260, age: 130, highlight: ["4K při 120 snímcích", "4K at 120 frames per second"] },
  { cat: "consoles", brand: "vexa", kind: "console", name: "Vexa Station Go", code: "STGO", short: ["Kapesní konzole pro hraní kdekoli.", "A handheld console to play anywhere."], price: 8990, colors: [C.graphite, C.white], specs: { storage: 512, max_resolution: "Full HD", disc_drive: false, handheld: true }, badges: ["new"], sold: 110, age: 4, highlight: ["7″ OLED displej", "a 7″ OLED screen"] },
  // Gaming accessories
  { cat: "gaming-accessories", brand: "vexa", kind: "controller", name: "Vexa Pad Pro", code: "PADP", short: ["Profesionální ovladač s výměnnými páčkami.", "A pro controller with swappable sticks."], price: 2490, colors: [C.black, C.white, C.red], specs: { platform: ["Vexa Station, PC", "Vexa Station, PC"], wireless: true, battery_life: 30 }, badges: ["tip"], sold: 230, age: 85, highlight: ["haptická odezva", "haptic feedback"] },
  { cat: "gaming-accessories", brand: "quill", kind: "controller", name: "Quill Play Lite", code: "PLYL", short: ["Kabelový ovladač pro PC.", "A wired controller for PC."], price: 790, colors: [C.black], specs: { platform: "PC", wireless: false, battery_life: 0 }, sold: 190, age: 230, highlight: ["kompatibilita s PC", "PC compatibility"] },
  // GPUs
  { cat: "gpus", brand: "tessaro", kind: "gpu", name: "Tessaro Forge G7 12GB", code: "FG7", short: ["Grafická karta pro hraní ve 1440p.", "A graphics card for 1440p gaming."], price: 14990, old: 16490, colors: [C.black], specs: { vram: 12, memory_type: "GDDR7", tdp: 220, outputs: "3× DP 2.1, 1× HDMI 2.1", length: 285 }, badges: ["sale"], sold: 95, age: 65, highlight: ["12 GB paměti GDDR7", "12 GB of GDDR7 memory"] },
  { cat: "gpus", brand: "tessaro", kind: "gpu", name: "Tessaro Forge G9 16GB", code: "FG9", short: ["Špičková karta pro 4K a tvorbu.", "A top-tier card for 4K and creative work."], price: 29990, colors: [C.silver], specs: { vram: 16, memory_type: "GDDR7", tdp: 320, outputs: "3× DP 2.1, 1× HDMI 2.1", length: 320 }, badges: ["new"], sold: 40, age: 10, highlight: ["výkon pro 4K hraní", "4K gaming performance"] },
  // SSD
  { cat: "ssd", brand: "moravo", kind: "ssd", name: "Moravo Swift NVMe", code: "SWF", short: ["Rychlý NVMe disk PCIe 5.0.", "A fast PCIe 5.0 NVMe drive."], price: 1990, colors: [C.black], option: { name: "storage", values: [TB(1, 0), TB(2, 1800), TB(4, 5500)] }, specs: { interface: "PCIe 5.0 NVMe", read_speed: 12000, write_speed: 11000, form_factor: "M.2 2280" }, badges: ["bestseller"], sold: 410, age: 115, highlight: ["čtení až 12 000 MB/s", "reads up to 12,000 MB/s"] },
  { cat: "ssd", brand: "moravo", kind: "ssd", name: "Moravo Vault Portable", code: "VLT", short: ["Přenosný SSD do kapsy s USB-C.", "A pocket USB-C portable SSD."], price: 2490, colors: [C.blue, C.graphite], option: { name: "storage", values: [TB(1, 0), TB(2, 1500)] }, specs: { interface: "USB 3.2 Gen 2", read_speed: 1050, write_speed: 1000, form_factor: ["Přenosný", "Portable"] }, sold: 150, age: 180, highlight: ["odolnost proti pádu", "drop resistance"] },
  // Power
  { cat: "power", brand: "quill", kind: "charger", name: "Quill Charge 65W GaN", code: "CH65", short: ["Malá nabíječka pro notebook i telefon.", "A tiny charger for laptop and phone."], price: 1190, colors: [C.white, C.black], specs: { power_w: 65, capacity: 0, ports: 3, gan: true }, badges: ["bestseller"], sold: 520, age: 140, highlight: ["tři porty USB-C", "three USB-C ports"] },
  { cat: "power", brand: "quill", kind: "powerbank", name: "Quill Bank 20000", code: "BNK20", short: ["Powerbanka na celý víkend.", "A power bank for the whole weekend."], price: 1290, old: 1490, colors: [C.sand, C.graphite], specs: { power_w: 45, capacity: 20000, ports: 2, gan: false }, badges: ["sale"], sold: 380, age: 210, highlight: ["kapacita 20 000 mAh", "a 20,000 mAh capacity"] },
  // Peripherals
  { cat: "peripherals", brand: "quill", kind: "keyboard", name: "Quill Keys Mechanical", code: "KEYM", short: ["Tichá mechanická klávesnice s podsvícením.", "A quiet backlit mechanical keyboard."], price: 2790, colors: [C.graphite, C.white], option: { name: "edition", values: [["cz", "CZ/SK rozložení", "CZ/SK layout", 0], ["us", "US rozložení", "US layout", 0]] }, specs: { device_type: ["Klávesnice", "Keyboard"], wireless: true, layout: ["CZ/SK, US", "CZ/SK, US"], dpi: 0 }, badges: ["new"], sold: 130, age: 30, highlight: ["tiché mechanické spínače", "quiet mechanical switches"] },
  { cat: "peripherals", brand: "quill", kind: "mouse", name: "Quill Glide Mouse", code: "GLD", short: ["Ergonomická bezdrátová myš.", "An ergonomic wireless mouse."], price: 990, colors: [C.black, C.sand, C.lilac], specs: { device_type: ["Myš", "Mouse"], wireless: true, layout: ["Pro praváky", "Right-handed"], dpi: 8000 }, badges: ["tip"], sold: 290, age: 160, highlight: ["senzor 8 000 DPI", "an 8,000 DPI sensor"] },
];

export const BADGES = [
  { code: "new", label: ["Novinka", "New"] as Tr, bg: "#1d5c55", fg: "#ffffff", sort: 1 },
  { code: "sale", label: ["Akce", "Sale"] as Tr, bg: "#b23a2b", fg: "#ffffff", sort: 2 },
  { code: "bestseller", label: ["Bestseller", "Bestseller"] as Tr, bg: "#fcefd9", fg: "#6b3f06", sort: 3 },
  { code: "tip", label: ["Tip redakce", "Editor's pick"] as Tr, bg: "#25212b", fg: "#ffffff", sort: 4 },
];

const CATEGORY_COPY: Record<string, Tr> = {
  smartphones: [
    "Telefon zvládne vše od rychlých fotek po celodenní práci a díky aktualizacím vydrží svěží roky.",
    "The phone handles everything from quick snaps to a full working day, and regular updates keep it fresh for years.",
  ],
  tablets: [
    "Tablet je stvořený pro čtení, kreslení i práci na cestách.",
    "The tablet is made for reading, sketching and working on the go.",
  ],
  laptops: [
    "Notebook spojuje výkon s tichým chodem a kvalitní klávesnicí pro dlouhé psaní.",
    "The laptop combines performance with quiet operation and a quality keyboard for long writing sessions.",
  ],
  monitors: [
    "Monitor má nastavitelný stojan a ergonomické funkce šetrné k očím.",
    "The monitor has an adjustable stand and eye-friendly ergonomic features.",
  ],
  tvs: [
    "Televize přináší kinematografický obraz, chytré aplikace a herní režim s nízkou latencí.",
    "The TV delivers a cinematic picture, smart apps and a low-latency game mode.",
  ],
  streaming: [
    "Přehrávač připojíte do HDMI a během chvíle sledujete oblíbené služby.",
    "Plug the streamer into HDMI and start watching your favourite services within moments.",
  ],
  headphones: [
    "Sluchátka nabízejí čistý a vyvážený zvuk a pohodlí i při dlouhém poslechu.",
    "The headphones offer a clean, balanced sound and comfort for long listening sessions.",
  ],
  speakers: [
    "Reproduktor hraje plným zvukem s překvapivě hlubokými basy.",
    "The speaker plays a full sound with surprisingly deep bass.",
  ],
  smartwatches: [
    "Hodinky sledují tep, spánek i trénink a upozorní na důležité zprávy.",
    "The watch tracks heart rate, sleep and workouts and alerts you to important messages.",
  ],
  fitness: [
    "Náramek nenápadně měří aktivitu celý den i celou noc.",
    "The tracker quietly measures your activity all day and night.",
  ],
  consoles: [
    "Konzole nabízí rychlé načítání, tichý chod a obrovskou knihovnu her.",
    "The console offers fast loading, quiet operation and a huge game library.",
  ],
  "gaming-accessories": [
    "Příslušenství je navržené pro dlouhé herní seance a přesné ovládání.",
    "The accessory is designed for long gaming sessions and precise control.",
  ],
  gpus: [
    "Karta zvládne moderní hry s ray tracingem i akceleraci tvůrčích aplikací.",
    "The card handles modern ray-traced games and accelerates creative applications.",
  ],
  ssd: [
    "Disk výrazně zrychlí start systému, načítání her i práci s velkými soubory.",
    "The drive dramatically speeds up boot times, game loading and work with large files.",
  ],
  power: [
    "Inteligentní řízení nabíjení chrání baterii vašich zařízení.",
    "Smart charge management protects the batteries of your devices.",
  ],
  peripherals: [
    "Ergonomický tvar a kvalitní materiály zajistí pohodlí při celodenní práci.",
    "An ergonomic shape and quality materials keep you comfortable all day.",
  ],
};

export function describe(p: ProductSeed): Tr {
  const copy = CATEGORY_COPY[p.cat] ?? ["", ""];
  return [
    `${p.short[0]}\n\n${p.name} vyniká především díky tomu, že nabízí ${p.highlight[0]}. ${copy[0]}\n\nV balení najdete vše potřebné pro okamžité použití. Na produkt se vztahuje záruka 24 měsíců a možnost vrácení do 30 dnů.`,
    `${p.short[1]}\n\nThe ${p.name} stands out above all by offering ${p.highlight[1]}. ${copy[1]}\n\nThe box contains everything you need to get started right away. The product comes with a 24-month warranty and 30-day returns.`,
  ];
}

export const REVIEW_POOL: Array<{ rating: number; cs: string; en: string }> = [
  { rating: 5, cs: "Skvělý kus, předčil moje očekávání. Doručení druhý den.", en: "Great product, exceeded my expectations. Delivered the next day." },
  { rating: 5, cs: "Kvalitní zpracování a výborná výdrž. Doporučuji.", en: "Excellent build quality and battery life. Recommended." },
  { rating: 4, cs: "Za tu cenu velmi dobré, jen nabíječka by mohla být v balení.", en: "Very good for the price, I just wish a charger was in the box." },
  { rating: 4, cs: "Spokojenost, drobnost: aplikace by mohla být přehlednější.", en: "Happy with it; minor gripe: the app could be clearer." },
  { rating: 5, cs: "Používám denně a nemám jedinou výtku.", en: "I use it every day and have no complaints at all." },
  { rating: 3, cs: "Funguje, ale čekal jsem trochu víc.", en: "It works, but I expected a bit more." },
  { rating: 5, cs: "Nejlepší nákup letošního roku.", en: "Best purchase of the year." },
  { rating: 4, cs: "Rychlé, tiché a pěkně vypadá.", en: "Fast, quiet and looks nice." },
  { rating: 2, cs: "Po týdnu mi začal vadit design, ale funkčně v pořádku.", en: "After a week the design started to bother me, but it works fine." },
];

export const REVIEW_AUTHORS = ["Jana K.", "Petr N.", "Lucie M.", "Tomáš V.", "Eva S.", "Martin H.", "Alex P.", "Sam R.", "Kateřina D.", "Ondřej B."];
