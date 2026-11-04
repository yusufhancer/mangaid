"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Link as LinkIcon,
  Upload,
  ArrowRight,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  BookOpen,
  AlertCircle,
  Sliders,
  X,
  FileArchive,
  Eye,
  Languages,
  Search,
  FolderArchive,
  HelpCircle,
  History,
  Pencil,
  Layers,
  ArrowUpDown,
  Check,
  Maximize,
  Minimize,
  Columns,
  Rows,
  Home,
  Smartphone,
  Copy,
  Headphones,
  Play,
  Pause,
  Volume2,
  Sparkles,
  Bell,
  Filter,
  Tag,
  SlidersHorizontal,
  Compass,
} from "lucide-react";

interface AppVersionInfo {
  version: string;
  release_date: string;
  title: string;
  changelog: string[];
}

const BACKEND_URL = "";

const resolveProxyImage = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  if (url.startsWith("/api/proxy/image?")) {
    if (!url.includes("v=2")) {
      return url.replace("/api/proxy/image?", "/api/proxy/image?v=2&");
    }
    return url;
  }
  if (url.includes("mangadex.org") || url.includes("mangadex.network")) {
    return `/api/proxy/image?v=2&url=${encodeURIComponent(url)}`;
  }
  return url;
};

interface PageItem {
  page_number: number;
  image_url: string;
}

interface IngestData {
  session_id: string;
  url: string;
  title: string | null;
  chapter_number: string | null;
  layer_used: string;
  confidence: number;
  pages: PageItem[];
}

interface JobStatus {
  job_id: string;
  chapter_id: string;
  stage: string;
  total_pages: number;
  completed_pages: number;
  current_page: number;
  error_message: string | null;
}

interface ChapterPage {
  page_number: number;
  original_url: string;
  translated_url: string | null;
  status: string;
}

interface ChapterData {
  id: string;
  title: string | null;
  chapter_number: string | null;
  language_source?: string | null;
  pages: ChapterPage[];
}

interface SavedChapter {
  id: string;
  title: string | null;
  chapter_number: string | null;
  language_source: string;
  total_pages: number;
  rendered_pages: number;
  created_at: string | null;
}

interface MangaSeries {
  title: string;
  chapters: SavedChapter[];
  totalChapters: number;
  totalPages: number;
  totalRenderedPages: number;
  coverChapterId: string;
  latestCreatedAt: string | null;
}

interface RenameTarget {
  type: "series" | "chapter";
  id?: string;
  oldTitle?: string;
  currentTitle: string;
  currentChapterNumber?: string;
}

interface DeleteTarget {
  type: "series" | "chapter";
  id?: string;
  title: string;
  count?: number;
  redirectHome?: boolean;
}

interface ExplorerManga {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  year: number | null;
  cover_url: string | null;
  tags: string[];
  source?: string;
  original_url?: string | null;
}

interface ExplorerChapter {
  id: string;
  chapter_number: string;
  title: string | null;
  pages_count: number;
  language: string;
  group_name: string | null;
  publish_at: string | null;
  is_external: boolean;
  external_url: string | null;
  source?: string;
}

const SOURCE_GENRES: Record<"mangadex" | "raw" | "komikindo" | "nhentai", string[]> = {
  mangadex: [
    "4-Koma",
    "Academy",
    "Action",
    "Adaptation",
    "Adventure",
    "Age Gap",
    "Aliens",
    "Androids",
    "Angels",
    "Animals",
    "Anthology",
    "Apocalypse",
    "Aristocracy",
    "Arranged Marriage",
    "Art",
    "Assassin",
    "Award Winning",
    "Battle Royale",
    "Beast",
    "Boss / Employee",
    "Boys' Love",
    "Brother's Complex",
    "Bullying",
    "Campus",
    "Childcare",
    "Childhood Friends",
    "Chunibyo",
    "College",
    "Comedy",
    "Conspiracy",
    "Cooking",
    "Crime",
    "Crossdressing",
    "Cultivation",
    "Cyberpunk",
    "Dark Fantasy",
    "Death Game",
    "Deities",
    "Delinquent",
    "Delinquents",
    "Demon King",
    "Demons",
    "Detective",
    "Doctors",
    "Doujinshi",
    "Dragons",
    "Drama",
    "Dungeon",
    "Dystopian",
    "Ecchi",
    "Elves",
    "Empire Building",
    "Enemies to Lovers",
    "Episodic",
    "Erotica",
    "Espionage",
    "Exorcism",
    "Fairy Tale",
    "Family",
    "Fan Colored",
    "Fantasy",
    "Female Protagonist",
    "Full Color",
    "Gangs",
    "Genderswap",
    "Ghosts",
    "Ghosts & Spirits",
    "Girls' Love",
    "Gladiator",
    "Gods",
    "Gore",
    "Gourmet",
    "Guild",
    "Gyaru",
    "Harem",
    "Healing (Iyashikei)",
    "High School",
    "Historical",
    "Horror",
    "Hunters",
    "Idol",
    "Incest",
    "Isekai",
    "Isekai Reincarnation",
    "Josei",
    "Kingdom Building",
    "Knights",
    "Leveling",
    "Loli",
    "Long Strip",
    "Love Triangle",
    "Mafia",
    "Magic",
    "Magic Academy",
    "Magical Girls",
    "Magical Realism",
    "Mahjong",
    "Male Protagonist",
    "Manga",
    "Manhua",
    "Manhwa",
    "Marriage",
    "Martial Arts",
    "Mecha",
    "Medical",
    "Medieval",
    "Milf",
    "Military",
    "Modern Fantasy",
    "Monster Girls",
    "Monster Taming",
    "Monsters",
    "Multiple POV",
    "Murim",
    "Music",
    "Mystery",
    "Mythology",
    "Necromancer",
    "Ninja",
    "Nobility",
    "Office Romance",
    "Office Workers",
    "Official Colored",
    "Ojou-sama",
    "Oneshot",
    "Otome Game",
    "Otome Isekai",
    "Overpowered (OP MC)",
    "Parenting",
    "Parody",
    "Pets",
    "Philosophical",
    "Police",
    "Politics",
    "Post-Apocalyptic",
    "Post-Apocalyptic Survival",
    "Prison",
    "Psychological",
    "Psychological Thriller",
    "Rebirth",
    "Regression",
    "Reincarnation",
    "Revenge",
    "Reverse Harem",
    "Reverse Isekai",
    "Romance",
    "Romantic Comedy (Romcom)",
    "Royalty",
    "Safe",
    "Salaryman",
    "Samurai",
    "School Life",
    "School Romance",
    "Sci-Fi",
    "Secret Identity",
    "Seinen",
    "Self-Published",
    "Senpai / Kouhai",
    "Sensei / Student",
    "Sexual Violence",
    "Shinigami",
    "Shota",
    "Shoujo",
    "Shounen",
    "Showbiz",
    "Sister's Complex",
    "Slice of Life",
    "Slow Life",
    "Space",
    "Sports",
    "Steampunk",
    "Suggestive",
    "Super Power",
    "Superhero",
    "Supernatural",
    "Survival",
    "Survival Game",
    "System",
    "Teachers",
    "Thriller",
    "Time Loop",
    "Time Travel",
    "Tomboy",
    "Tower Climbing",
    "Traditional Games",
    "Tragedy",
    "Transmigration",
    "Tsundere",
    "Underworld",
    "Urban Fantasy",
    "Vampire Romance",
    "Vampires",
    "Video Games",
    "Villain",
    "Villainess",
    "Villainess Redemption",
    "Virtual Reality",
    "Virtual World",
    "War",
    "Web Comic",
    "Webtoon",
    "Witches",
    "Workplace",
    "Wuxia",
    "Xianxia",
    "Xuanhuan",
    "Yakuza",
    "Yandere",
    "Youth",
    "Zombies"
],
  raw: [
    "4-Koma",
    "Academy",
    "Action",
    "Adaptation",
    "Adventure",
    "Age Gap",
    "Aliens",
    "Androids",
    "Angels",
    "Animals",
    "Anthology",
    "Apocalypse",
    "Aristocracy",
    "Arranged Marriage",
    "Art",
    "Assassin",
    "Award Winning",
    "Battle Royale",
    "Beast",
    "Boss / Employee",
    "Boys' Love",
    "Brother's Complex",
    "Bullying",
    "Campus",
    "Childcare",
    "Childhood Friends",
    "Chunibyo",
    "College",
    "Comedy",
    "Conspiracy",
    "Cooking",
    "Crime",
    "Crossdressing",
    "Cultivation",
    "Cyberpunk",
    "Dark Fantasy",
    "Death Game",
    "Deities",
    "Delinquent",
    "Delinquents",
    "Demon King",
    "Demons",
    "Detective",
    "Doctors",
    "Doujinshi",
    "Dragons",
    "Drama",
    "Dungeon",
    "Dystopian",
    "Ecchi",
    "Elves",
    "Empire Building",
    "Enemies to Lovers",
    "Episodic",
    "Erotica",
    "Espionage",
    "Exorcism",
    "Fairy Tale",
    "Family",
    "Fan Colored",
    "Fantasy",
    "Female Protagonist",
    "Full Color",
    "Gangs",
    "Genderswap",
    "Ghosts",
    "Ghosts & Spirits",
    "Girls' Love",
    "Gladiator",
    "Gods",
    "Gore",
    "Gourmet",
    "Guild",
    "Gyaru",
    "Harem",
    "Healing (Iyashikei)",
    "High School",
    "Historical",
    "Horror",
    "Hunters",
    "Idol",
    "Incest",
    "Isekai",
    "Isekai Reincarnation",
    "Josei",
    "Kingdom Building",
    "Knights",
    "Leveling",
    "Loli",
    "Long Strip",
    "Love Triangle",
    "Mafia",
    "Magic",
    "Magic Academy",
    "Magical Girls",
    "Magical Realism",
    "Mahjong",
    "Male Protagonist",
    "Manga",
    "Manhua",
    "Manhwa",
    "Marriage",
    "Martial Arts",
    "Mecha",
    "Medical",
    "Medieval",
    "Milf",
    "Military",
    "Modern Fantasy",
    "Monster Girls",
    "Monster Taming",
    "Monsters",
    "Multiple POV",
    "Murim",
    "Music",
    "Mystery",
    "Mythology",
    "Necromancer",
    "Ninja",
    "Nobility",
    "Office Romance",
    "Office Workers",
    "Official Colored",
    "Ojou-sama",
    "Oneshot",
    "Otome Game",
    "Otome Isekai",
    "Overpowered (OP MC)",
    "Parenting",
    "Parody",
    "Pets",
    "Philosophical",
    "Police",
    "Politics",
    "Post-Apocalyptic",
    "Post-Apocalyptic Survival",
    "Prison",
    "Psychological",
    "Psychological Thriller",
    "RAW China",
    "RAW Jepang",
    "RAW Korea",
    "Rebirth",
    "Regression",
    "Reincarnation",
    "Revenge",
    "Reverse Harem",
    "Reverse Isekai",
    "Romance",
    "Romantic Comedy (Romcom)",
    "Royalty",
    "Safe",
    "Salaryman",
    "Samurai",
    "School Life",
    "School Romance",
    "Sci-Fi",
    "Secret Identity",
    "Seinen",
    "Self-Published",
    "Senpai / Kouhai",
    "Sensei / Student",
    "Sexual Violence",
    "Shinigami",
    "Shota",
    "Shoujo",
    "Shounen",
    "Showbiz",
    "Sister's Complex",
    "Slice of Life",
    "Slow Life",
    "Space",
    "Sports",
    "Steampunk",
    "Suggestive",
    "Super Power",
    "Superhero",
    "Supernatural",
    "Survival",
    "Survival Game",
    "System",
    "Teachers",
    "Thriller",
    "Time Loop",
    "Time Travel",
    "Tomboy",
    "Tower Climbing",
    "Traditional Games",
    "Tragedy",
    "Transmigration",
    "Tsundere",
    "Underworld",
    "Urban Fantasy",
    "Vampire Romance",
    "Vampires",
    "Video Games",
    "Villain",
    "Villainess",
    "Villainess Redemption",
    "Virtual Reality",
    "Virtual World",
    "War",
    "Web Comic",
    "Webtoon",
    "Witches",
    "Workplace",
    "Wuxia",
    "Xianxia",
    "Xuanhuan",
    "Yakuza",
    "Yandere",
    "Youth",
    "Zombies"
],
  komikindo: [
    "Action",
    "Adult",
    "Adventure",
    "Akademi",
    "Akademi Sihir",
    "Aliens",
    "Angels",
    "Animals",
    "Anthology",
    "Apocalypse",
    "Aristokrasi",
    "Arranged Marriage",
    "Artefak Kuno",
    "Arts",
    "Assassin",
    "Award Winning",
    "Bacakomik",
    "Balas Dendam",
    "Bela Diri",
    "Bencana",
    "Betrayal",
    "Blacksmith",
    "Bos Karyawan",
    "Boys' Love",
    "Bullying",
    "Childcare",
    "Childhood Friends",
    "Cinta Segitiga",
    "College",
    "Comedy",
    "Cooking",
    "Crime",
    "Crossdressing",
    "Cultivation",
    "Cyberpunk",
    "Dark Fantasy",
    "Death Game",
    "Delinquents",
    "Demon King",
    "Demons",
    "Detektif",
    "Dokter",
    "Doujinshi",
    "Dragon",
    "Drama",
    "Drama Supernatural",
    "Dungeon",
    "Dungeon Master",
    "Dunia Game",
    "Dunia Lain",
    "Dystopian",
    "Ecchi",
    "Elves",
    "Empire Building",
    "Enemies to Lovers",
    "Erotica",
    "Espionage",
    "Exorcist",
    "Fairy Tale",
    "Family",
    "Fan Colored",
    "Fantasy",
    "Female Protagonist",
    "Full Color",
    "Game",
    "Game Virtual",
    "Gangs",
    "Gender Bender",
    "Genderswap",
    "Genshin",
    "Ghosts",
    "Girls' Love",
    "Gods",
    "Gore",
    "Gourmet",
    "Guild",
    "Gyaru",
    "Hantu",
    "Harem",
    "Harta Karun",
    "Healer",
    "Healing",
    "Hermit",
    "High School",
    "Historical",
    "Horror",
    "Hunter",
    "Hunters",
    "Iblis",
    "Idol",
    "Ikan Asin",
    "Incest",
    "Infiltrasi",
    "Investigasi",
    "Isekai",
    "Isekai Reinkarnasi",
    "Iyashikei",
    "Jepang",
    "Jodoh",
    "Josei",
    "Jutsu",
    "Kaisar",
    "Kehidupan Sekolah",
    "Keluarga",
    "Kembalinya Legenda",
    "Kerajaan",
    "Kerja Keras",
    "Kimono",
    "Kiryuu",
    "Knights",
    "Komedi Romantis",
    "Komik Warna",
    "Korea",
    "Ksatria",
    "Ksatria Sihir",
    "Kultivasi Abadi",
    "Kultivasi Iblis",
    "Leveling",
    "Life",
    "Loli",
    "Long Strip",
    "Mafia",
    "Magic",
    "Magic Academy",
    "Magical Girls",
    "Mahasiswa",
    "Mahjong",
    "Male Protagonist",
    "Manajemen Wilayah",
    "Manhua",
    "Manhwa",
    "Manhwa Indo",
    "Manhwa Webtoon",
    "Martial",
    "Martial Arts",
    "Masa Depan",
    "Masak",
    "Master Sekte",
    "Mature",
    "Mecha",
    "Medical",
    "Medieval",
    "Mengasuh Anak",
    "Miliarder",
    "Military",
    "Militer",
    "Misteri Pembunuhan",
    "Modern",
    "Modern Fantasy",
    "Monster Girls",
    "Monster Tamer",
    "Monsters",
    "Murid Nakal",
    "Murim",
    "Music",
    "Musisi",
    "Mystery",
    "Mythology",
    "Necromancer",
    "Netorare (NTR)",
    "Netoratori",
    "Ninja",
    "Nobility",
    "Non-Human",
    "Office Romance",
    "Office Workers",
    "Official Colored",
    "Ojou-sama",
    "One Shot",
    "Oneshot",
    "Ongoing",
    "Otome Game",
    "Otome Isekai",
    "Overpowered",
    "Overpowered (OP MC)",
    "Pahlawan",
    "Pangeran",
    "Parenting",
    "Parody",
    "Pembalasan Dendam",
    "Pembunuh Bayaran",
    "Pencak Silat",
    "Penyihir",
    "Perang",
    "Perjalanan Waktu",
    "Pet",
    "Philosophical",
    "Police",
    "Polisi",
    "Politik",
    "Post-Apocalyptic",
    "Post-Apocalyptic Survival",
    "Psychological",
    "Putri Duyung",
    "Putri Kerajaan",
    "Raja Iblis",
    "Raja Naga",
    "Ranker",
    "Rebirth",
    "Regresi (Regression)",
    "Reincarnation",
    "Reinkarnasi",
    "Remake",
    "Rencana Balas Dendam",
    "Returned",
    "Revenge",
    "Reverse Harem",
    "Reverse Isekai",
    "Romance",
    "Romance Comedy (Romcom)",
    "Romantis Dewasa",
    "Royalty",
    "Sahabat Masa Kecil",
    "Salaryman",
    "Samurai",
    "Satire",
    "School",
    "School Life",
    "School Life Romance",
    "Sci-Fi",
    "Secret Identity",
    "Seinen",
    "Sekte Rahasia",
    "Self-Published",
    "Senjata Api",
    "Sensei",
    "Sepak Bola",
    "Sexual Violence",
    "Shinigami",
    "Shota",
    "Shotacon",
    "Shoujo",
    "Shoujo Ai",
    "Shounen",
    "Shounen Ai",
    "Showbiz",
    "Sihir Kuno",
    "Silat Dewa",
    "Slice of Life",
    "Slow Life",
    "Smut",
    "Solo Leveling",
    "Solo Player",
    "Space",
    "Sport",
    "Sports",
    "Steampunk",
    "Sub Indo",
    "Super Power",
    "Superhero",
    "Supernatural",
    "Supernatural Romance",
    "Survival",
    "System",
    "System Hunter",
    "System Leveling",
    "Tamat",
    "Teacher",
    "Teknologi Masa Depan",
    "Thriller",
    "Time Loop",
    "Time Travel",
    "Tomboy",
    "Tower Climbing",
    "Traditional Games",
    "Traged",
    "Tragedi",
    "Tragedy",
    "Transmigrasi",
    "Tsundere",
    "Turnamen",
    "Underdog",
    "Underworld",
    "Urban",
    "Urban Cultivation",
    "Urban Fantasy",
    "Vampir",
    "Vampires",
    "Video Games",
    "Villain",
    "Villainess",
    "Villainess Redemption",
    "Virtual Reality",
    "Virtual World",
    "Web Comic",
    "Webtoon",
    "Wuxia",
    "Xianxia",
    "Xuanhuan",
    "Yakuza",
    "Yandere",
    "Yaoi",
    "Yuri",
    "Zombie Apocalypse",
    "Zombies"
],
  nhentai: [
    "ahegao",
    "anal",
    "anal intercourse",
    "angel",
    "apron",
    "armor",
    "asphyxiation",
    "ass expansion",
    "bald",
    "ball caressing",
    "ballgag",
    "bandages",
    "bar",
    "barefoot",
    "bathtub",
    "bbm",
    "bbw",
    "bdsm",
    "beach",
    "beast",
    "beauty mark",
    "belly expansion",
    "bestiality",
    "big areolae",
    "big ass",
    "big breasts",
    "big clit",
    "big lips",
    "big nipples",
    "big penis",
    "bikini",
    "bikkuri",
    "birth",
    "bites",
    "biting",
    "blackmail",
    "blindfold",
    "blood",
    "bloomers",
    "blowjob",
    "blowjob face",
    "body modification",
    "bodysuit",
    "bondage",
    "bone",
    "boots",
    "booty",
    "brainwash",
    "breast expansion",
    "breast feeding",
    "breast hold",
    "breast reduction",
    "bukkake",
    "bunny girl",
    "burping",
    "business suit",
    "catgirl",
    "cbt",
    "centaur",
    "cervix penetration",
    "chastity device",
    "cheating",
    "chikan",
    "choker",
    "clothed female nude male",
    "clothed male nude female",
    "clothed paizuri",
    "coat",
    "collar",
    "condom",
    "corruption",
    "cosplaying",
    "cowgirl",
    "crossdressing",
    "crotch tattoo",
    "crying",
    "cuckold",
    "cunnilingus",
    "dark nipples",
    "dark skin",
    "deepthroat",
    "defloration",
    "demon",
    "demon girl",
    "dick growth",
    "dickgirl on dickgirl",
    "dickgirl on female",
    "dickgirl on male",
    "dilf",
    "dirty old man",
    "dog girl",
    "doll joints",
    "domination",
    "double anal",
    "double blowjob",
    "double penetration",
    "double vaginal",
    "doujinshi",
    "dragon",
    "drugs",
    "drunk",
    "ear cleaning",
    "ebisu",
    "electro stimulation",
    "elf",
    "enema",
    "eromanga",
    "exhibitionism",
    "eye-covering bang",
    "eyepatch",
    "facesitting",
    "fairy",
    "fangs",
    "fantasy",
    "farting",
    "father",
    "females only",
    "femdom",
    "ffm threesome",
    "filming",
    "fingering",
    "first person perspective",
    "fishnets",
    "flat chest",
    "floating",
    "focus blowjob",
    "focus paizuri",
    "fondling",
    "foot licking",
    "footjob",
    "forced exposure",
    "foreskin",
    "fox girl",
    "french kiss",
    "frottage",
    "full color",
    "furry",
    "futanari",
    "gag",
    "gangbang",
    "gaping",
    "garter belt",
    "gender bender",
    "gender change",
    "gender morph",
    "ghost",
    "giantess",
    "giga breasts",
    "glasses",
    "glory hole",
    "gloves",
    "gokkun",
    "goth",
    "gothic lolita",
    "groping",
    "group",
    "guppy",
    "gyaru",
    "hair buns",
    "hair ribbons",
    "hairy",
    "hairy armpits",
    "halterneck",
    "handjob",
    "harem",
    "harness",
    "headband",
    "headpiece",
    "heart pupils",
    "heavy makeup",
    "hidden cam",
    "high heels",
    "hijab",
    "horns",
    "hot spring",
    "huge breasts",
    "huge penis",
    "humiliation",
    "hypnosis",
    "idol",
    "impregnation",
    "incest",
    "incontinence",
    "infantilism",
    "inflatable",
    "inseki",
    "inverted nipples",
    "invisible",
    "kemonomimi",
    "kigurumi",
    "kimono",
    "kinky",
    "kissing",
    "knee socks",
    "kneeling",
    "kuro gyaru",
    "kyonyuu",
    "lab coat",
    "lactation",
    "large tattoo",
    "latex",
    "latex suit",
    "layered skirt",
    "leash",
    "leg lock",
    "leggings",
    "leotard",
    "lewd",
    "lingerie",
    "lolicon",
    "long hair",
    "maid",
    "males only",
    "mask",
    "masturbation",
    "meat cleaver",
    "megane",
    "megane musume",
    "melons",
    "mermaid",
    "metal armor",
    "micro bikini",
    "middle finger",
    "milf",
    "military",
    "mind break",
    "mind control",
    "minigirl",
    "miniguy",
    "miniskirt",
    "mmf threesome",
    "mob",
    "molestation",
    "monster",
    "monster girl",
    "moral degeneration",
    "mosaic censorship",
    "mother",
    "multi-work series",
    "muscle",
    "muscle girl",
    "mutilation",
    "nakadashi",
    "nanpa",
    "navel piercing",
    "necrophilia",
    "nekomimi",
    "netorare",
    "netorase",
    "netori",
    "ninja",
    "nipple fuck",
    "nipple piercing",
    "nipples",
    "no penetration",
    "nopan",
    "nudity only",
    "nun",
    "nurse",
    "oil",
    "older brother",
    "older sister",
    "onahole",
    "onee-san",
    "onesie",
    "oppai",
    "oral",
    "orgasm",
    "otoko no ko",
    "overweight",
    "oyako",
    "paizuri",
    "pajamas",
    "panties",
    "pantihose",
    "pants",
    "pantsu",
    "parasite",
    "pasties",
    "pegging",
    "petite",
    "petplay",
    "piercing",
    "pig",
    "pigtails",
    "pillory",
    "pixie cut",
    "plug",
    "ponytail",
    "possession",
    "pregnancy",
    "pregnant",
    "prostate massage",
    "prostitution",
    "pubic hair",
    "public",
    "public sex",
    "queen",
    "quickie",
    "rape",
    "raw",
    "restraints",
    "reverse rape",
    "ribbon",
    "rimjob",
    "ring",
    "robot",
    "rope",
    "ryona",
    "sailor suit",
    "saimin",
    "saliva",
    "scat",
    "scatological",
    "scent",
    "school swimsuit",
    "schoolboy uniform",
    "schoolgirl uniform",
    "scrotum",
    "seduction",
    "selfcest",
    "sensei",
    "sex toys",
    "shared",
    "shemale",
    "shibari",
    "short hair",
    "shota",
    "shota dominance",
    "shotacon",
    "shy",
    "silver hair",
    "sister",
    "sister-in-law",
    "skinny",
    "slave",
    "sleeping",
    "slime",
    "slut",
    "small breasts",
    "smegma",
    "smell",
    "smut",
    "snuff",
    "socks",
    "sole dickgirl",
    "sole female",
    "sole male",
    "spanking",
    "spectacles",
    "spiked collar",
    "spitting",
    "squirt",
    "squirting",
    "step-daughter",
    "step-father",
    "step-mother",
    "step-sister",
    "stockings",
    "stomach deformation",
    "strap-on",
    "stripper",
    "succubus",
    "suction cups",
    "sukebe",
    "sunburn",
    "sweat",
    "swimsuit",
    "sword",
    "tail",
    "tall girl",
    "tan",
    "teacher",
    "teasing",
    "tentacles",
    "thigh highs",
    "threesome",
    "tied up",
    "tomboy",
    "tomgirl",
    "tongue",
    "tongue piercing",
    "torture",
    "tracksuit",
    "transformation",
    "tribadism",
    "triple penetration",
    "tsundere",
    "tsurime",
    "twintails",
    "two girls one cup",
    "unbuttoned shirt",
    "uncensored",
    "underarm",
    "underboob",
    "underwater",
    "undressing",
    "unfazed",
    "uniform",
    "unusual pupils",
    "urination",
    "vaginal piercing",
    "vampire",
    "vanilla",
    "vibrator",
    "virginity",
    "vomit",
    "voyeurism",
    "waitress",
    "water",
    "watersports",
    "weight gain",
    "wet clothes",
    "whip",
    "white hair",
    "widow",
    "wife",
    "wing",
    "witch",
    "wolf girl",
    "wooden horse",
    "worker",
    "wrestling",
    "x-ray",
    "yandere",
    "yaoi",
    "yau",
    "young",
    "youth",
    "yuri",
    "zombie"
],
};

export default function MangaIDApp() {
  // Navigation states: 'home' | 'review' | 'progress' | 'reader'
  const [view, setView] = useState<"home" | "review" | "progress" | "reader">("home");
  const [activeNavTab, setActiveNavTab] = useState<"jelajah" | "penerjemah" | "koleksi">("jelajah");
  const [savedChapters, setSavedChapters] = useState<SavedChapter[]>([]);

  // Penerjemah states
  const [translatorMode, setTranslatorMode] = useState<"url" | "upload">("url");
  const [urlInput, setUrlInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Explorer & Jelajah states
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [explorerSource, setExplorerSource] = useState<"mangadex" | "raw" | "komikindo" | "nhentai">("mangadex");
  const [explorerQuery, setExplorerQuery] = useState("");
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerResults, setExplorerResults] = useState<ExplorerManga[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreSearchInput, setGenreSearchInput] = useState("");
  const [showGenreSearch, setShowGenreSearch] = useState(false);
  const [explorerHasSearched, setExplorerHasSearched] = useState(false);
  const [explorerSelectedManga, setExplorerSelectedManga] = useState<ExplorerManga | null>(null);
  const [explorerChapters, setExplorerChapters] = useState<ExplorerChapter[]>([]);
  const [explorerChaptersLoading, setExplorerChaptersLoading] = useState(false);
  const [explorerLang, setExplorerLang] = useState("all");
  const [explorerChapterSearch, setExplorerChapterSearch] = useState("");
  const [explorerSortOrder, setExplorerSortOrder] = useState<"asc" | "desc">("asc");
  const [ingestingChapterId, setIngestingChapterId] = useState<string | null>(null);
  const [directReadingChapterId, setDirectReadingChapterId] = useState<string | null>(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [tone, setTone] = useState("gaul");
  const [honorifics, setHonorifics] = useState("keep");

  // Search & Filter & Help states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showHelp, setShowHelp] = useState(false);

  // Series & Drawer states
  const [selectedSeries, setSelectedSeries] = useState<MangaSeries | null>(null);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState("");
  const [drawerSortOrder, setDrawerSortOrder] = useState<"asc" | "desc">("asc");

  // Rename states
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [newTitleInput, setNewTitleInput] = useState("");
  const [newChapterNumInput, setNewChapterNumInput] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Review states
  const [ingestResult, setIngestResult] = useState<IngestData | null>(null);
  const [reviewPages, setReviewPages] = useState<string[]>([]);

  // Job & Progress states
  const [jobId, setJobId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  // Reader states
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [showTranslated, setShowTranslated] = useState(true);
  const [readerMode, setReaderMode] = useState<"vertical" | "single">("vertical");
  const [singlePageIdx, setSinglePageIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileReaderMenu, setShowMobileReaderMenu] = useState(false);

  // AI Voice Narration (Audiobook) states
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioVoice, setAudioVoice] = useState<"auto" | "ardi" | "gadis">("auto");
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [currentAudioPage, setCurrentAudioPage] = useState<number>(1);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Device & Workspace states
  const [deviceId, setDeviceId] = useState<string>("");
  const [copiedId, setCopiedId] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncIdInput, setSyncIdInput] = useState("");

  // App Update Notification states
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo | null>(null);
  const [hasNewUpdate, setHasNewUpdate] = useState<boolean>(false);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);

  // Native Push / Browser Notification states
  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const sendBrowserNotification = (title: string, body: string, url: string = "/") => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            const notifOptions: any = {
              body,
              icon: "/logo.png",
              badge: "/icons/icon-192x192.png",
              vibrate: [150, 50, 150],
              data: { url }
            };
            reg.showNotification(title, notifOptions);
          }).catch(() => {
            new Notification(title, { body, icon: "/logo.png" });
          });
        } else {
          new Notification(title, { body, icon: "/logo.png" });
        }
      } catch (e) {
        console.debug("Notification error:", e);
      }
    }
  };

  const requestNotificationAccess = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Browser pada perangkat ini belum mendukung fitur Web Notification.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === "granted") {
        sendBrowserNotification(
          "🔔 Notifikasi MangaID Aktif!",
          "Status bar HP / Laptop Anda akan menerima pemberitahuan otomatis saat komik selesai diterjemahkan atau ada update versi!"
        );
      } else if (perm === "denied") {
        alert("Izin notifikasi diblokir oleh browser. Anda dapat mengizinkannya di setelan situs browser.");
      }
    } catch (err) {
      console.error("Gagal meminta izin notifikasi:", err);
    }
  };

  // Device & Workspace management
  useEffect(() => {
    if (typeof window !== "undefined") {
      let currentId = localStorage.getItem("mangaid_device_id");
      if (!currentId) {
        currentId = "dev-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);
        localStorage.setItem("mangaid_device_id", currentId);
      }
      setDeviceId(currentId);
    }
  }, []);

  const apiFetch = (url: string, options: RequestInit = {}) => {
    const currentId =
      deviceId ||
      (typeof window !== "undefined"
        ? localStorage.getItem("mangaid_device_id") || "default"
        : "default");
    const headers = new Headers(options.headers || {});
    if (!headers.has("X-Device-Id")) {
      headers.set("X-Device-Id", currentId);
    }
    return fetch(url, { ...options, headers });
  };

  // Check server version & show update modal/banner if new
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const resp = await apiFetch(`${BACKEND_URL}/api/version`);
        if (resp.ok) {
          const data: AppVersionInfo = await resp.json();
          setVersionInfo(data);
          if (typeof window !== "undefined") {
            const lastSeen = localStorage.getItem("mangaid_last_seen_version");
            if (lastSeen !== data.version) {
              setHasNewUpdate(true);
              setShowUpdateModal(true);
              sendBrowserNotification(
                `🚀 MangaID Update: v${data.version} Tersedia!`,
                `${data.title} - Buka MangaID untuk melihat fitur baru.`
              );
            }
          }
        }
      } catch (err) {
        console.debug("Version check error:", err);
      }
    };
    checkVersion();
  }, []);

  const handleAcknowledgeUpdate = (reload: boolean = false) => {
    if (versionInfo && typeof window !== "undefined") {
      localStorage.setItem("mangaid_last_seen_version", versionInfo.version);
    }
    setShowUpdateModal(false);
    setHasNewUpdate(false);
    if (reload && typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const handleCopyDeviceId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && deviceId) {
      navigator.clipboard.writeText(deviceId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleApplySyncId = (newId: string) => {
    const cleanId = newId.trim();
    if (!cleanId) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("mangaid_device_id", cleanId);
    }
    setDeviceId(cleanId);
    setShowSyncModal(false);
    setShowSettings(false);
    setTimeout(() => {
      loadSavedChapters();
    }, 100);
  };

  const handleResetDeviceId = () => {
    if (confirm("Buat ID Perangkat baru? Rak komik Anda akan mulai dari kosong (koleksi sebelumnya tetap tersimpan di ID lama).")) {
      const newId = "dev-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now().toString(36);
      if (typeof window !== "undefined") {
        localStorage.setItem("mangaid_device_id", newId);
      }
      setDeviceId(newId);
      setShowSyncModal(false);
      setShowSettings(false);
      setTimeout(() => {
        loadSavedChapters();
      }, 100);
    }
  };

  // Quick test URL
  const SAMPLE_URL = "https://mangadex.org/chapter/e9cfaece-daa1-4830-b239-2d09c407b56b/6";

  // Handle URL Ingestion
  const handleIngestUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const resp = await apiFetch(`${BACKEND_URL}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      if (!resp.ok) {
        let errorDetail = "Gagal memproses URL.";
        try {
          const err = await resp.json();
          errorDetail = err.detail || errorDetail;
        } catch {
          const text = await resp.text();
          if (text) {
            errorDetail = `Server error (${resp.status}): ${text.slice(0, 100)}`;
          }
        }
        throw new Error(errorDetail);
      }

      const data: IngestData = await resp.json();
      setIngestResult(data);
      setReviewPages(data.pages.map((p) => p.image_url));
      setView("review");
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat mengekstrak link.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Manual Upload Ingestion
  const handleManualUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("files", selectedFiles[i]);
      }
      formData.append("title", uploadTitle.trim() || "Uploaded Chapter");

      const resp = await apiFetch(`${BACKEND_URL}/api/ingest/upload`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Gagal memproses file upload.");
      }

      const data: IngestData = await resp.json();
      setIngestResult(data);
      setReviewPages(data.pages.map((p) => p.image_url));
      setView("review");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengunggah file.");
    } finally {
      setLoading(false);
    }
  };

  // Explorer handlers
  const handleSearchManga = async (
    customQuery?: string,
    customSource?: "mangadex" | "raw" | "komikindo" | "nhentai",
    customGenres?: string[]
  ) => {
    const q = (customQuery !== undefined ? customQuery : explorerQuery).trim();
    const src = customSource !== undefined ? customSource : explorerSource;
    const gn = customGenres !== undefined ? customGenres : selectedGenres;

    setExplorerLoading(true);
    setErrorMsg(null);
    setExplorerHasSearched(true);

    try {
      const genresParam = gn.length > 0 ? `&genres=${encodeURIComponent(gn.join(","))}` : "";
      const resp = await fetch(`${BACKEND_URL}/api/explorer/search?q=${encodeURIComponent(q)}&source=${src}${genresParam}&limit=24`);
      if (!resp.ok) {
        throw new Error("Gagal mencari manga di katalog.");
      }
      const data: ExplorerManga[] = await resp.json();
      setExplorerResults(data);
      setCarouselIdx(0);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat mencari manga.");
    } finally {
      setExplorerLoading(false);
    }
  };

  const handleSwitchSource = (newSource: "mangadex" | "raw" | "komikindo" | "nhentai") => {
    setExplorerSource(newSource);
    setSelectedGenres([]);
    setExplorerQuery("");
    handleSearchManga("", newSource, []);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const loadMangaChapters = async (mangaId: string, lang: string) => {
    setExplorerChaptersLoading(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/explorer/manga/${encodeURIComponent(mangaId)}/chapters?lang=${lang}&limit=100`);
      if (!resp.ok) {
        throw new Error("Gagal mengambil daftar bab.");
      }
      const data: ExplorerChapter[] = await resp.json();
      setExplorerChapters(data);
    } catch (err: any) {
      console.error("Load manga chapters error:", err);
    } finally {
      setExplorerChaptersLoading(false);
    }
  };

  const handleSelectManga = async (manga: ExplorerManga) => {
    setExplorerSelectedManga(manga);
    setExplorerChapterSearch("");
    setExplorerSortOrder("asc");
    loadMangaChapters(manga.id, explorerLang);

    // If source is nhentai or manga has few tags, fetch full details asynchronously to populate all tags
    if (manga.id.startsWith("nh-") || manga.tags.length <= 2) {
      try {
        const resp = await fetch(`${BACKEND_URL}/api/explorer/manga/${encodeURIComponent(manga.id)}/details`);
        if (resp.ok) {
          const detailData: ExplorerManga = await resp.json();
          setExplorerSelectedManga((current) => {
            if (!current || current.id !== manga.id) return current;
            const mergedTags = Array.from(new Set([...current.tags, ...(detailData.tags || [])]));
            return {
              ...current,
              tags: mergedTags,
              title: detailData.title || current.title,
              description: detailData.description || current.description,
            };
          });
        }
      } catch (e) {
        console.warn("Failed fetching manga full details:", e);
      }
    }
  };

  const handleDirectReadExplorerChapter = async (chapter: ExplorerChapter) => {
    setDirectReadingChapterId(chapter.id);
    setErrorMsg(null);

    try {
      let targetUrl = chapter.external_url;
      if (!targetUrl) {
        if (chapter.id.startsWith("nh-")) {
          targetUrl = chapter.id.replace("nh-", "");
        } else if (chapter.id.startsWith("ki-")) {
          targetUrl = decodeURIComponent(chapter.id.replace("ki-", ""));
        } else if (chapter.id.startsWith("http")) {
          targetUrl = chapter.id;
        } else {
          targetUrl = `https://mangadex.org/chapter/${chapter.id}`;
        }
      }

      // 1. Ingest chapter pages
      const ingestResp = await apiFetch(`${BACKEND_URL}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!ingestResp.ok) {
        let errDet = "Gagal memproses bab manga.";
        try {
          const err = await ingestResp.json();
          errDet = err.detail || errDet;
        } catch {
          const text = await ingestResp.text();
          if (text) errDet = `Server error: ${text.slice(0, 100)}`;
        }
        throw new Error(errDet);
      }

      const ingestData: IngestData = await ingestResp.json();
      const pageUrls = ingestData.pages.map((p) => p.image_url);

      // 2. Simpan langsung ke database chapters & riwayat pembaca
      const saveResp = await apiFetch(`${BACKEND_URL}/api/chapters/direct-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          title: ingestData.title || explorerSelectedManga?.title || "Manga",
          chapter_number: ingestData.chapter_number || chapter.chapter_number || "1",
          pages: pageUrls,
        }),
      });

      if (!saveResp.ok) {
        throw new Error("Gagal menyimpan bab ke riwayat pembaca.");
      }

      const savedData: ChapterData = await saveResp.json();

      // Save directly to localStorage history cache as well
      if (typeof window !== "undefined") {
        try {
          const currentHistory: SavedChapter[] = JSON.parse(localStorage.getItem("mangaid_user_history") || "[]");
          const newEntry: SavedChapter = {
            id: savedData.id,
            title: savedData.title,
            chapter_number: savedData.chapter_number,
            language_source: savedData.language_source || "id",
            total_pages: savedData.pages.length,
            rendered_pages: savedData.pages.length,
            created_at: new Date().toISOString(),
          };
          const updated = [newEntry, ...currentHistory.filter((c) => c.id !== savedData.id)];
          localStorage.setItem("mangaid_user_history", JSON.stringify(updated));
          localStorage.setItem(`mangaid_detail_${savedData.id}`, JSON.stringify(savedData));
        } catch (e) {
          console.warn("Local history cache error:", e);
        }
      }

      // 3. Buka langsung di reader & refresh riwayat
      setExplorerSelectedManga(null);
      setChapterData(savedData);
      setSinglePageIdx(0);
      setView("reader");

      if (typeof window !== "undefined") {
        window.history.pushState({}, "", `?chapter=${savedData.id}`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      loadSavedChapters();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memuat bab untuk dibaca.");
    } finally {
      setDirectReadingChapterId(null);
    }
  };

  const handleIngestExplorerChapter = async (chapter: ExplorerChapter) => {
    setIngestingChapterId(chapter.id);
    setErrorMsg(null);

    try {
      let targetUrl = chapter.external_url;
      if (!targetUrl) {
        if (chapter.id.startsWith("nh-")) {
          targetUrl = chapter.id.replace("nh-", "");
        } else if (chapter.id.startsWith("ki-")) {
          targetUrl = decodeURIComponent(chapter.id.replace("ki-", ""));
        } else if (chapter.id.startsWith("http")) {
          targetUrl = chapter.id;
        } else {
          targetUrl = `https://mangadex.org/chapter/${chapter.id}`;
        }
      }

      const resp = await apiFetch(`${BACKEND_URL}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!resp.ok) {
        let errorDetail = "Gagal memproses bab manga.";
        try {
          const err = await resp.json();
          errorDetail = err.detail || errorDetail;
        } catch {
          const text = await resp.text();
          if (text) errorDetail = `Server error: ${text.slice(0, 100)}`;
        }
        throw new Error(errorDetail);
      }

      const data: IngestData = await resp.json();
      setIngestResult(data);
      setReviewPages(data.pages.map((p) => p.image_url));
      setExplorerSelectedManga(null);
      setView("review");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengambil data bab manga.");
    } finally {
      setIngestingChapterId(null);
    }
  };

  // Start Translation Job
  const handleStartTranslation = async () => {
    if (!ingestResult) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const resp = await apiFetch(`${BACKEND_URL}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: ingestResult.session_id,
          pages: reviewPages,
          settings: {
            tone,
            honorifics,
          },
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Gagal memulai terjemahan.");
      }

      const data = await resp.json();
      setJobId(data.job_id);
      setChapterId(data.chapter_id);
      setView("progress");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal memulai tugas.");
    } finally {
      setLoading(false);
    }
  };

  // Polling Job Progress
  useEffect(() => {
    if (view !== "progress" || !jobId) return;

    const interval = setInterval(async () => {
      try {
        const resp = await apiFetch(`${BACKEND_URL}/api/jobs/${jobId}`);
        if (!resp.ok) return;

        const data: JobStatus = await resp.json();
        setJobStatus(data);

        if (data.stage === "done") {
          clearInterval(interval);
          sendBrowserNotification(
            "📖 Terjemahan Komik Selesai!",
            "Bab manga Anda telah selesai diterjemahkan oleh AI. Klik untuk langsung membaca!"
          );
          fetchChapter(data.chapter_id);
        } else if (data.stage === "failed") {
          clearInterval(interval);
          sendBrowserNotification(
            "⚠️ Penerjemahan Gagal",
            data.error_message || "Terjadi kesalahan saat memproses gambar komik."
          );
          setErrorMsg(data.error_message || "Penerjemahan gagal.");
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [view, jobId]);

  // Load saved chapters from backend + persistent localStorage cache
  const loadSavedChapters = async () => {
    // 1. Instantly load from localStorage so user never sees an empty screen
    let localChapters: SavedChapter[] = [];
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("mangaid_user_history");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localChapters = parsed;
            setSavedChapters(parsed);
          }
        }
      } catch (e) {
        console.warn("Failed loading cached history:", e);
      }
    }

    try {
      const resp = await apiFetch(`${BACKEND_URL}/api/chapters`);
      if (resp.ok) {
        const backendChapters: SavedChapter[] = await resp.json();
        if (Array.isArray(backendChapters) && backendChapters.length > 0) {
          // Merge backend chapters with any local chapters not yet in backend
          const backendIds = new Set(backendChapters.map((c) => c.id));
          const missingFromBackend = localChapters.filter((c) => !backendIds.has(c.id));
          const merged = [...backendChapters, ...missingFromBackend];
          setSavedChapters(merged);
          if (typeof window !== "undefined") {
            localStorage.setItem("mangaid_user_history", JSON.stringify(merged));
          }

          if (missingFromBackend.length > 0) {
            const syncPayload = missingFromBackend.map((c) => {
              let pages: string[] | undefined = undefined;
              if (typeof window !== "undefined") {
                try {
                  const det = localStorage.getItem(`mangaid_detail_${c.id}`);
                  if (det) {
                    const parsedDet = JSON.parse(det);
                    if (parsedDet && Array.isArray(parsedDet.pages)) {
                      pages = parsedDet.pages.map((p: any) => p.original_url || p.image_url || p.translated_url);
                    }
                  }
                } catch {}
              }
              return { ...c, pages };
            });
            apiFetch(`${BACKEND_URL}/api/chapters/sync`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chapters: syncPayload }),
            }).catch((e) => console.warn("Auto-sync missing chapters error:", e));
          }
        } else if (localChapters.length > 0) {
          // Backend database is fresh/empty after container update/rebuild!
          // NEVER wipe user's local collection! Keep local chapters and sync to backend.
          setSavedChapters(localChapters);
          const syncPayload = localChapters.map((c) => {
            let pages: string[] | undefined = undefined;
            if (typeof window !== "undefined") {
              try {
                const det = localStorage.getItem(`mangaid_detail_${c.id}`);
                if (det) {
                  const parsedDet = JSON.parse(det);
                  if (parsedDet && Array.isArray(parsedDet.pages)) {
                    pages = parsedDet.pages.map((p: any) => p.original_url || p.image_url || p.translated_url);
                  }
                }
              } catch {}
            }
            return { ...c, pages };
          });
          apiFetch(`${BACKEND_URL}/api/chapters/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chapters: syncPayload }),
          }).catch((e) => console.warn("Auto-restore history error:", e));
        }
      }
    } catch (err) {
      console.error("Fetch saved chapters error:", err);
    }
  };

  const handleExportHistory = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedChapters, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mangaid_history_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      alert("Gagal mengunduh backup riwayat.");
    }
  };

  const handleImportHistory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const chapters: SavedChapter[] = JSON.parse(text);
      if (!Array.isArray(chapters) || chapters.length === 0) {
        throw new Error("File backup tidak valid atau kosong.");
      }
      setSavedChapters(chapters);
      if (typeof window !== "undefined") {
        localStorage.setItem("mangaid_user_history", JSON.stringify(chapters));
      }
      // Sync to backend SQLite
      await apiFetch(`${BACKEND_URL}/api/chapters/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters }),
      });
      alert(`Berhasil memulihkan ${chapters.length} bab ke riwayat!`);
    } catch (err: any) {
      alert(`Gagal memulihkan riwayat: ${err.message || err}`);
    } finally {
      e.target.value = "";
    }
  };

  // PWA & Install prompt handling
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if app is running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      console.log("[MangaID PWA] App was successfully installed!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsAppInstalled(true);
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        "Petunjuk Pemasangan Aplikasi MangaID:\n\n" +
        "• Android (Chrome): Buka menu browser (titik 3 di kanan atas) lalu pilih 'Install aplikasi' atau 'Tambahkan ke Layar Utama'.\n" +
        "• iPhone / iPad (Safari): Klik tombol Bagikan (ikon kotak dengan panah ke atas di bawah) lalu pilih 'Tambah ke Layar Utama' (Add to Home Screen).\n" +
        "• Laptop / PC (Chrome / Edge): Klik ikon Pasang / Install (di bilah URL kanan atas)."
      );
    }
  };

  // Initial load
  useEffect(() => {
    loadSavedChapters();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cId = params.get("chapter");
      if (cId) {
        fetchChapter(cId);
      } else {
        // Otomatis muat manga terpopuler saat pertama kali aplikasi dibuka
        handleSearchManga("", "mangadex", []);
      }
    }
  }, [deviceId]);

  // Otomatis rotasi carousel judul unggulan setiap 6 detik
  useEffect(() => {
    if (view !== "home" || activeNavTab !== "jelajah" || explorerResults.length === 0) return;
    const maxIdx = Math.min(5, explorerResults.length);
    if (maxIdx <= 1) return;
    const timer = setInterval(() => {
      setCarouselIdx((prev) => (prev + 1) % maxIdx);
    }, 6000);
    return () => clearInterval(timer);
  }, [view, activeNavTab, explorerResults.length]);

  // Fetch Chapter for Reader
  const fetchChapter = async (cId: string) => {
    try {
      const resp = await apiFetch(`${BACKEND_URL}/api/chapters/${cId}`);
      if (resp.ok) {
        const data: ChapterData = await resp.json();
        setChapterData(data);
        if (typeof window !== "undefined") {
          localStorage.setItem(`mangaid_detail_${cId}`, JSON.stringify(data));
        }
        setSinglePageIdx(0);
        setView("reader");
        if (typeof window !== "undefined") {
          window.history.pushState({}, "", `?chapter=${cId}`);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }
    } catch (err) {
      console.error("Fetch chapter error:", err);
    }

    // Fallback to local storage detail cache if backend container was restarted/empty
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`mangaid_detail_${cId}`);
        if (cached) {
          const cachedData: ChapterData = JSON.parse(cached);
          setChapterData(cachedData);
          setSinglePageIdx(0);
          setView("reader");
          window.history.pushState({}, "", `?chapter=${cId}`);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      } catch (e) {
        console.warn("Failed loading cached chapter detail:", e);
      }
    }
  };

  // Reader preferences & controls
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("mangaid_reader_mode");
      if (savedMode === "single" || savedMode === "vertical") {
        setReaderMode(savedMode);
      }
    }
  }, []);

  const handleSetReaderMode = (mode: "vertical" | "single") => {
    setReaderMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("mangaid_reader_mode", mode);
      if (mode === "vertical") {
        setTimeout(() => {
          const targetEl = document.getElementById(`webtoon-page-${singlePageIdx + 1}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }, 50);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const goToSlidePage = (newIdx: number) => {
    if (!chapterData) return;
    const clamped = Math.max(0, Math.min(newIdx, chapterData.pages.length - 1));
    setSinglePageIdx(clamped);
    const targetP = clamped + 1;
    setCurrentAudioPage(targetP);
    if (showAudioPlayer && audioPlaying) {
      playPageAudio(targetP, audioVoice, audioSpeed);
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error("Error attempting to exit fullscreen:", err);
        });
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation for reader (arrows & fullscreen)
  useEffect(() => {
    if (view !== "reader" || !chapterData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (readerMode === "single") {
        const total = chapterData.pages.length;
        if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
          e.preventDefault();
          if (singlePageIdx < total - 1) {
            goToSlidePage(singlePageIdx + 1);
          }
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
          e.preventDefault();
          if (singlePageIdx > 0) {
            goToSlidePage(singlePageIdx - 1);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, chapterData, readerMode, singlePageIdx, showAudioPlayer, audioPlaying]);

  // AI Voice Narration (Audiobook) Controls
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playPageAudio = (pageNum: number, voice: "auto" | "ardi" | "gadis" = audioVoice, speed: number = audioSpeed) => {
    if (!chapterData) return;
    setAudioLoading(true);
    setAudioError(null);
    setCurrentAudioPage(pageNum);

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.playbackRate = speed;

      const audioUrl = `${BACKEND_URL}/api/chapters/${chapterData.id}/pages/${pageNum}/audio?voice=${voice}&v=${Date.now()}`;
      audio.src = audioUrl;

      // PWA Media Session API: Background & Lock Screen Controls
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        try {
          (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
            title: `${chapterData.title || "Manga"} — Bab ${chapterData.chapter_number || "1"}`,
            artist: `MangaID AI Voice (${voice === "auto" ? "🎭 Drama Komik" : voice === "gadis" ? "Gadis" : "Ardi"})`,
            album: `Halaman ${pageNum} dari ${chapterData.pages.length}`,
            artwork: [
              { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" }
            ]
          });
          (navigator as any).mediaSession.setActionHandler("play", () => {
            if (audioRef.current) {
              audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => {});
            }
          });
          (navigator as any).mediaSession.setActionHandler("pause", () => {
            if (audioRef.current) {
              audioRef.current.pause();
              setAudioPlaying(false);
            }
          });
          (navigator as any).mediaSession.setActionHandler("nexttrack", () => {
            handleNextAudioPage();
          });
          (navigator as any).mediaSession.setActionHandler("previoustrack", () => {
            handlePrevAudioPage();
          });
        } catch (e) {
          console.warn("MediaSession error:", e);
        }
      }

      audio.onended = () => {
        // Continuous Playback: Auto-advance to next page
        if (pageNum < chapterData.pages.length) {
          const nextPage = pageNum + 1;
          if (readerMode === "single") {
            goToSlidePage(nextPage - 1);
          } else {
            const el = document.getElementById(`webtoon-page-${nextPage}`);
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }
          playPageAudio(nextPage, voice, speed);
        } else {
          setAudioPlaying(false);
        }
      };

      audio.onerror = () => {
        setAudioLoading(false);
        setAudioPlaying(false);
        setAudioError("Halaman ini belum memiliki teks dialog atau audio sedang diproses AI.");
      };

      audio.oncanplay = () => {
        setAudioLoading(false);
        audio.play().then(() => {
          setAudioPlaying(true);
        }).catch((err) => {
          console.warn("Audio autoplay blocked:", err);
          setAudioPlaying(false);
        });
      };

      audio.load();
    } catch (err: any) {
      setAudioLoading(false);
      setAudioPlaying(false);
      setAudioError("Gagal memuat audio narasi.");
    }
  };

  const toggleAudioPlayer = () => {
    if (showAudioPlayer) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setAudioPlaying(false);
      setShowAudioPlayer(false);
    } else {
      setShowAudioPlayer(true);
      const targetPage = readerMode === "single" ? singlePageIdx + 1 : 1;
      playPageAudio(targetPage, audioVoice, audioSpeed);
    }
  };

  const togglePlayPause = () => {
    const activePage = readerMode === "single" ? singlePageIdx + 1 : currentAudioPage;
    if (!audioRef.current || currentAudioPage !== activePage) {
      playPageAudio(activePage, audioVoice, audioSpeed);
      return;
    }
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => {
        playPageAudio(activePage, audioVoice, audioSpeed);
      });
    }
  };

  const handleNextAudioPage = () => {
    if (!chapterData || currentAudioPage >= chapterData.pages.length) return;
    const nextP = currentAudioPage + 1;
    if (readerMode === "single") goToSlidePage(nextP - 1);
    else {
      const el = document.getElementById(`webtoon-page-${nextP}`);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
    playPageAudio(nextP, audioVoice, audioSpeed);
  };

  const handlePrevAudioPage = () => {
    if (currentAudioPage <= 1) return;
    const prevP = currentAudioPage - 1;
    if (readerMode === "single") goToSlidePage(prevP - 1);
    else {
      const el = document.getElementById(`webtoon-page-${prevP}`);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
    playPageAudio(prevP, audioVoice, audioSpeed);
  };

  const handleChangeVoice = (v: "auto" | "ardi" | "gadis") => {
    setAudioVoice(v);
    if (showAudioPlayer) {
      playPageAudio(currentAudioPage, v, audioSpeed);
    }
  };

  const handleChangeSpeed = () => {
    const nextSpeed = audioSpeed === 1.0 ? 1.25 : audioSpeed === 1.25 ? 1.5 : 1.0;
    setAudioSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // Series Grouping
  const seriesList: MangaSeries[] = useMemo(() => {
    const map = new Map<string, SavedChapter[]>();
    savedChapters.forEach((ch) => {
      const sTitle = (ch.title || "Untitled Manga").trim();
      if (!map.has(sTitle)) {
        map.set(sTitle, []);
      }
      map.get(sTitle)!.push(ch);
    });

    const list: MangaSeries[] = [];
    map.forEach((chList, title) => {
      chList.sort((a, b) => {
        const numA = parseFloat((a.chapter_number || "0").replace(/[^\d.]/g, "")) || 0;
        const numB = parseFloat((b.chapter_number || "0").replace(/[^\d.]/g, "")) || 0;
        return numA - numB;
      });

      const totalPages = chList.reduce((acc, c) => acc + (c.total_pages || 0), 0);
      const totalRendered = chList.reduce((acc, c) => acc + (c.rendered_pages || 0), 0);
      const coverChapterId = chList[0]?.id || "";
      const latestCreated = chList.reduce((latest, c) => {
        if (!latest) return c.created_at;
        if (!c.created_at) return latest;
        return new Date(c.created_at) > new Date(latest) ? c.created_at : latest;
      }, chList[0]?.created_at || null);

      list.push({
        title,
        chapters: chList,
        totalChapters: chList.length,
        totalPages,
        totalRenderedPages: totalRendered,
        coverChapterId,
        latestCreatedAt: latestCreated,
      });
    });

    return list;
  }, [savedChapters]);

  // Find current series & adjacent chapters for reader
  const readerNav = useMemo(() => {
    if (!chapterData) {
      return { currentSeries: null, prevChapter: null, nextChapter: null, currentIndex: -1 };
    }

    const series =
      seriesList.find((s) => s.chapters.some((c) => c.id === chapterData.id)) ||
      (chapterData.title
        ? seriesList.find((s) => s.title.toLowerCase() === chapterData.title!.toLowerCase())
        : null);

    if (!series || !series.chapters || series.chapters.length === 0) {
      return { currentSeries: series || null, prevChapter: null, nextChapter: null, currentIndex: -1 };
    }

    const idx = series.chapters.findIndex((c) => c.id === chapterData.id);
    const prevChapter = idx > 0 ? series.chapters[idx - 1] : null;
    const nextChapter = idx >= 0 && idx < series.chapters.length - 1 ? series.chapters[idx + 1] : null;

    return {
      currentSeries: series,
      prevChapter,
      nextChapter,
      currentIndex: idx,
    };
  }, [chapterData, seriesList]);

  const filteredSeries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return seriesList.filter((s) => {
      const titleMatch = s.title.toLowerCase().includes(q);
      const chapterMatch = s.chapters.some((c) => (c.chapter_number || "1").toLowerCase().includes(q));
      if (q && !titleMatch && !chapterMatch) return false;
      if (filterStatus === "done") {
        return s.totalRenderedPages === s.totalPages && s.totalPages > 0;
      }
      return true;
    });
  }, [seriesList, searchQuery, filterStatus]);

  const totalRenderedPagesAll = useMemo(() => {
    return savedChapters.reduce((acc, c) => acc + (c.rendered_pages || 0), 0);
  }, [savedChapters]);

  // Drawer Chapters with internal search & sorting
  const drawerChapters = useMemo(() => {
    if (!selectedSeries) return [];
    const current = seriesList.find((s) => s.title.toLowerCase() === selectedSeries.title.toLowerCase()) || selectedSeries;
    let list = [...current.chapters];

    const q = drawerSearchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (c) =>
          (c.chapter_number || "").toLowerCase().includes(q) ||
          (c.title || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const numA = parseFloat((a.chapter_number || "0").replace(/[^\d.]/g, "")) || 0;
      const numB = parseFloat((b.chapter_number || "0").replace(/[^\d.]/g, "")) || 0;
      return drawerSortOrder === "asc" ? numA - numB : numB - numA;
    });

    return list;
  }, [selectedSeries, seriesList, drawerSearchQuery, drawerSortOrder]);

  // Explorer filtered & sorted chapters
  const filteredExplorerChapters = useMemo(() => {
    let list = [...explorerChapters];
    const q = explorerChapterSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (c) =>
          c.chapter_number.toLowerCase().includes(q) ||
          (c.title || "").toLowerCase().includes(q) ||
          (c.group_name || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const numA = parseFloat(a.chapter_number.replace(/[^\d.]/g, "")) || 0;
      const numB = parseFloat(b.chapter_number.replace(/[^\d.]/g, "")) || 0;
      return explorerSortOrder === "asc" ? numA - numB : numB - numA;
    });
    return list;
  }, [explorerChapters, explorerChapterSearch, explorerSortOrder]);

  // Visible genres filtered by user's search text
  const visibleGenres = useMemo(() => {
    const list = SOURCE_GENRES[explorerSource] || [];
    if (!genreSearchInput.trim()) return list;
    const q = genreSearchInput.toLowerCase().trim();
    return list.filter((g) => g.toLowerCase().includes(q));
  }, [explorerSource, genreSearchInput]);

  // Explorer filtered results by selected genres
  const filteredExplorerResults = useMemo(() => {
    if (selectedGenres.length === 0) return explorerResults;
    return explorerResults.filter((manga) => {
      const tagsLower = (manga.tags || []).map((t) => t.toLowerCase());
      const titleLower = (manga.title || "").toLowerCase();
      const descLower = (manga.description || "").toLowerCase();

      return selectedGenres.every((genre) => {
        const gl = genre.toLowerCase().trim();
        if (!gl) return true;
        // Check tag match
        const inTags = tagsLower.some((t) => t === gl || t.includes(gl) || gl.includes(t));
        if (inTags) return true;
        // Check word in title or description
        const inText = titleLower.includes(gl) || descLower.includes(gl);
        return inText;
      });
    });
  }, [explorerResults, selectedGenres]);

  // Rename handlers
  const handleOpenRename = (target: RenameTarget) => {
    setRenameTarget(target);
    setNewTitleInput(target.currentTitle);
    setNewChapterNumInput(target.currentChapterNumber || "");
  };

  const handleConfirmRename = async () => {
    if (!renameTarget) return;
    const trimmedTitle = newTitleInput.trim();
    if (!trimmedTitle) return;

    setIsRenaming(true);
    try {
      if (renameTarget.type === "series") {
        const oldTitle = renameTarget.oldTitle || renameTarget.currentTitle;
        const resp = await apiFetch(`${BACKEND_URL}/api/chapters/series/rename`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            old_title: oldTitle,
            new_title: trimmedTitle,
          }),
        });
        if (resp.ok) {
          setSavedChapters((prev) =>
            prev.map((c) =>
              (c.title || "Untitled Manga").trim().toLowerCase() === oldTitle.trim().toLowerCase()
                ? { ...c, title: trimmedTitle }
                : c
            )
          );
          if (selectedSeries && selectedSeries.title.toLowerCase() === oldTitle.toLowerCase()) {
            setSelectedSeries((prev) => (prev ? { ...prev, title: trimmedTitle } : null));
          }
          if (chapterData && (chapterData.title || "").toLowerCase() === oldTitle.toLowerCase()) {
            setChapterData((prev) => (prev ? { ...prev, title: trimmedTitle } : null));
          }
        } else {
          alert("Gagal mengubah nama seri.");
        }
      } else if (renameTarget.type === "chapter" && renameTarget.id) {
        const trimmedChNum = newChapterNumInput.trim();
        const resp = await apiFetch(`${BACKEND_URL}/api/chapters/${renameTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            chapter_number: trimmedChNum || undefined,
          }),
        });
        if (resp.ok) {
          setSavedChapters((prev) =>
            prev.map((c) =>
              c.id === renameTarget.id
                ? { ...c, title: trimmedTitle, chapter_number: trimmedChNum || c.chapter_number }
                : c
            )
          );
          if (selectedSeries) {
            setSelectedSeries((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                chapters: prev.chapters.map((c) =>
                  c.id === renameTarget.id
                    ? { ...c, title: trimmedTitle, chapter_number: trimmedChNum || c.chapter_number }
                    : c
                ),
              };
            });
          }
          if (chapterData && chapterData.id === renameTarget.id) {
            setChapterData((prev) =>
              prev ? { ...prev, title: trimmedTitle, chapter_number: trimmedChNum || prev.chapter_number } : null
            );
          }
        } else {
          alert("Gagal mengubah nama bab.");
        }
      }
    } catch (err) {
      console.error("Rename error:", err);
      alert("Terjadi kesalahan saat mengubah nama.");
    } finally {
      setIsRenaming(false);
      setRenameTarget(null);
    }
  };

  // Delete handler
  const confirmDeleteAction = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "series") {
        const resp = await apiFetch(`${BACKEND_URL}/api/chapters/series/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ series_title: deleteTarget.title }),
        });
        if (resp.ok) {
          setSavedChapters((prev) =>
            prev.filter(
              (c) => (c.title || "Untitled Manga").trim().toLowerCase() !== deleteTarget.title.trim().toLowerCase()
            )
          );
          if (selectedSeries && selectedSeries.title.toLowerCase() === deleteTarget.title.toLowerCase()) {
            setSelectedSeries(null);
          }
        } else {
          alert("Gagal menghapus seri manga.");
        }
      } else if (deleteTarget.id) {
        const resp = await apiFetch(`${BACKEND_URL}/api/chapters/${deleteTarget.id}`, {
          method: "DELETE",
        });
        if (resp.ok) {
          setSavedChapters((prev) => prev.filter((c) => c.id !== deleteTarget.id));
          if (deleteTarget.redirectHome) {
            if (typeof window !== "undefined") {
              window.history.pushState({}, "", window.location.pathname);
            }
            setView("home");
          }
        } else {
          alert("Gagal menghapus bab.");
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Terjadi kesalahan saat menghapus.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Page reordering in review
  const movePage = (index: number, direction: "left" | "right") => {
    const newPages = [...reviewPages];
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPages.length) return;

    const temp = newPages[index];
    newPages[index] = newPages[targetIndex];
    newPages[targetIndex] = temp;
    setReviewPages(newPages);
  };

  const removePage = (index: number) => {
    setReviewPages(reviewPages.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-[#191a1c] text-[#ffffff]">
      {/* MangaDex-style Top Navigation Header */}
      {view !== "reader" && (
        <header className="sticky top-0 z-40 bg-[#141517]/95 backdrop-blur-md border-b border-[#2e3036] px-4 sm:px-6 lg:px-8 py-3 select-none">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
            {/* Left: Brand Logo & Desktop Navigation */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div
                onClick={() => {
                  setView("home");
                  setActiveNavTab("jelajah");
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-2.5 cursor-pointer group select-none"
              >
                <img
                  src="/logo.png"
                  alt="MangaID Logo"
                  className="w-8 h-8 rounded-[8px] object-cover border border-[#2e3036] group-hover:border-[#ff6740] transition-colors shadow-sm"
                />
                <span className="font-display text-xl font-black tracking-tight text-white flex items-center">
                  Manga<span className="text-[#ff6740]">ID</span>
                </span>
              </div>

              {/* Desktop Nav Tabs (MangaDex style) */}
              <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    setView("home");
                    setActiveNavTab("jelajah");
                  }}
                  className={`px-3 py-1.5 rounded-[6px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeNavTab === "jelajah" && view === "home"
                      ? "bg-[#2a2b30] text-[#ff6740]"
                      : "text-[#9ca3af] hover:text-white hover:bg-[#202125]"
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Jelajah</span>
                </button>

                <button
                  onClick={() => {
                    setView("home");
                    setActiveNavTab("penerjemah");
                  }}
                  className={`px-3 py-1.5 rounded-[6px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeNavTab === "penerjemah" && view === "home"
                      ? "bg-[#2a2b30] text-[#ff6740]"
                      : "text-[#9ca3af] hover:text-white hover:bg-[#202125]"
                  }`}
                >
                  <Languages className="w-4 h-4" />
                  <span>Penerjemah</span>
                </button>

                <button
                  onClick={() => {
                    setView("home");
                    setActiveNavTab("koleksi");
                  }}
                  className={`px-3 py-1.5 rounded-[6px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeNavTab === "koleksi" && view === "home"
                      ? "bg-[#2a2b30] text-[#ff6740]"
                      : "text-[#9ca3af] hover:text-white hover:bg-[#202125]"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Koleksi</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#2a2b30] text-[#9ca3af]">
                    {savedChapters.length}
                  </span>
                </button>
              </nav>
            </div>

            {/* Center: Global Quick Search Input (Desktop) */}
            <div className="hidden lg:flex items-center flex-1 max-w-md mx-2">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari manga di MangaDex, Komikindo, atau doujinshi..."
                  value={explorerQuery}
                  onChange={(e) => {
                    setExplorerQuery(e.target.value);
                    if (activeNavTab !== "jelajah") setActiveNavTab("jelajah");
                    if (view !== "home") setView("home");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (activeNavTab !== "jelajah") setActiveNavTab("jelajah");
                      if (view !== "home") setView("home");
                      handleSearchManga(e.currentTarget.value);
                    }
                  }}
                  className="w-full pl-9 pr-10 py-1.5 rounded-full bg-[#191a1c] border border-[#2e3036] focus:border-[#ff6740] focus:outline-none text-xs text-white placeholder-[#9ca3af]/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (activeNavTab !== "jelajah") setActiveNavTab("jelajah");
                    if (view !== "home") setView("home");
                    handleSearchManga();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#9ca3af] hover:text-[#ff6740] px-1 py-0.5 rounded cursor-pointer"
                  title="Cari"
                >
                  ↵
                </button>
              </div>
            </div>

            {/* Right: Controls & Badges */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-white px-2.5 py-1.5 rounded-[6px] border border-[#2e3036] bg-[#202125] hover:bg-[#2a2b30] transition-all cursor-pointer btn-press"
                title="Atur Gaya Bahasa Terjemahan"
              >
                <Sliders className="w-3.5 h-3.5 text-[#ff6740]" strokeWidth={1.5} />
                <span className="hidden sm:inline text-[#9ca3af]">Gaya:</span>
                <span className="text-white font-semibold capitalize">{tone}</span>
              </button>

              {hasNewUpdate && versionInfo && (
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#ff7e59] bg-[#ff6740]/15 border border-[#ff6740]/30 px-2 py-1.5 rounded-[6px] cursor-pointer hover:bg-[#ff6740]/25 active:scale-95 transition-all animate-pulse"
                >
                  <Sparkles className="w-3 h-3 text-[#ff6740]" />
                  <span className="hidden sm:inline">Update</span>
                  <span>v{versionInfo.version}</span>
                </button>
              )}

              {!isAppInstalled && (
                <button
                  onClick={handleInstallPWA}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-white bg-[#ff6740] hover:bg-[#ff7e59] px-3 py-1.5 rounded-[6px] transition-all cursor-pointer shadow-sm shadow-[#ff6740]/20 btn-press"
                  title="Pasang aplikasi MangaID ke ponsel / laptop"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Install</span>
                </button>
              )}

              <button
                onClick={() => setShowHelp(true)}
                className="p-1.5 text-[#9ca3af] hover:text-white hover:bg-[#202125] rounded-[6px] transition-colors cursor-pointer"
                title="Bantuan & Pintasan"
              >
                <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <div className="min-w-0 flex flex-col min-h-screen">

        {/* Top Update Notification Banner */}
        {hasNewUpdate && versionInfo && view !== "reader" && (
          <div className="bg-gradient-to-r from-[#ff6740]/20 via-[#ff6740]/10 to-[#ff6740]/20 border-b border-[#ff6740]/30 px-4 lg:px-8 py-2.5 flex items-center justify-between text-xs animate-fade-in z-20">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-2 w-2 relative flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff7e59] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6740]"></span>
              </span>
              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-[#ffffff]">
                  Pembaruan MangaID {versionInfo.version} Tersedia!
                </span>
                <span className="hidden md:inline text-[#9ca3af] text-[11px]">
                  — {versionInfo.title}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <button
                onClick={() => setShowUpdateModal(true)}
                className="px-2.5 py-1 rounded-[4px] bg-[#ff6740] hover:bg-[#ff7e59] text-white font-semibold text-[11px] transition-all cursor-pointer shadow-sm btn-press flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Lihat Update</span>
              </button>
              <button
                onClick={() => handleAcknowledgeUpdate(false)}
                className="text-[#9ca3af] hover:text-[#ffffff] p-1 cursor-pointer transition-colors"
                title="Tutup pemberitahuan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Desktop Top Sub-Bar / Breadcrumb (Hidden on Mobile and Reader) */}
        {view !== "reader" && (
          <div className="hidden lg:flex items-center justify-between px-8 py-3 border-b border-[#2e3036]/60 text-xs font-mono text-[#9ca3af]">
            <div className="flex items-center gap-2">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-[#ffffff] font-semibold capitalize">
                {view === "home" ? "Translator" : view}
              </span>
            </div>
            <div className="text-[11px] text-[#9ca3af]">
              {savedChapters.length} chapter di database
            </div>
          </div>
        )}

        {/* Settings Modal Drawer */}
        {showSettings && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#202125] border border-[#2e3036] rounded-[8px] max-w-md w-full p-6 shadow-2xl relative animate-scale-in">
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 text-[#9ca3af] hover:text-[#ffffff] transition-colors p-1 rounded-[4px] cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <h3 className="font-display text-base font-bold text-[#ffffff] mb-5">
                Pengaturan Terjemahan
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-mono text-[#9ca3af] uppercase tracking-wider block mb-2">
                    Gaya Nada Bahasa
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTone("gaul")}
                      className={`p-3 rounded-[6px] border text-left text-xs transition-all cursor-pointer ${
                        tone === "gaul"
                          ? "border-[#ff6740] bg-[#2a2b30] text-[#ffffff] shadow-sm shadow-[#ff6740]/10"
                          : "border-[#2e3036] bg-[#202125] text-[#9ca3af] hover:border-[#9ca3af]/40"
                      }`}
                    >
                      <div className="font-semibold text-sm mb-0.5 text-[#ffffff]">Gaul / Santai</div>
                      <div className="text-[#9ca3af]">Lo-gue, kata seru santai khas komik</div>
                    </button>
                    <button
                      onClick={() => setTone("neutral")}
                      className={`p-3 rounded-[6px] border text-left text-xs transition-all cursor-pointer ${
                        tone === "neutral"
                          ? "border-[#ff6740] bg-[#2a2b30] text-[#ffffff] shadow-sm shadow-[#ff6740]/10"
                          : "border-[#2e3036] bg-[#202125] text-[#9ca3af] hover:border-[#9ca3af]/40"
                      }`}
                    >
                      <div className="font-semibold text-sm mb-0.5 text-[#ffffff]">Baku / Netral</div>
                      <div className="text-[#9ca3af]">Bahasa Indonesia standar untuk narasi resmi</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-[#9ca3af] uppercase tracking-wider block mb-2">
                    Honorifik (-san, -kun, oppa)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setHonorifics("keep")}
                      className={`p-2.5 rounded-[6px] border text-xs font-medium transition-all cursor-pointer ${
                        honorifics === "keep"
                          ? "border-[#ff6740] bg-[#2a2b30] text-[#ffffff] shadow-sm shadow-[#ff6740]/10"
                          : "border-[#2e3036] bg-[#202125] text-[#9ca3af] hover:border-[#9ca3af]/40"
                      }`}
                    >
                      Pertahankan (-san, -kun)
                    </button>
                    <button
                      onClick={() => setHonorifics("drop")}
                      className={`p-2.5 rounded-[6px] border text-xs font-medium transition-all cursor-pointer ${
                        honorifics === "drop"
                          ? "border-[#ff6740] bg-[#2a2b30] text-[#ffffff] shadow-sm shadow-[#ff6740]/10"
                          : "border-[#2e3036] bg-[#202125] text-[#9ca3af] hover:border-[#9ca3af]/40"
                      }`}
                    >
                      Hapus / Lokalkan
                    </button>
                  </div>
                </div>

                {/* Device & Workspace Isolation */}
                <div className="pt-4 border-t border-[#2e3036] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-[#9ca3af] uppercase tracking-wider">
                      Ruang Kerja Pribadi (Perangkat)
                    </label>
                    <span className="text-[10px] font-mono text-[#4FA36B] bg-[#4FA36B]/10 border border-[#4FA36B]/20 px-2 py-0.5 rounded">
                      Database Terpisah
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                    Setiap perangkat memiliki database bab sendiri agar koleksi tidak bercampur dengan pengguna lain.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-[6px] bg-[#16161a] border border-[#2e3036] font-mono text-xs text-[#ffffff] truncate select-all">
                      {deviceId || "Memuat ID..."}
                    </div>
                    <button
                      onClick={handleCopyDeviceId}
                      className="px-3 py-2 rounded-[6px] border border-[#2e3036] bg-[#2a2b30] hover:border-[#9ca3af] text-xs font-medium text-[#ffffff] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 btn-press"
                      title="Salin ID Perangkat"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-[#4FA36B]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId ? "Tersalin!" : "Salin"}</span>
                    </button>
                    <button
                      onClick={() => {
                        setSyncIdInput(deviceId);
                        setShowSyncModal(true);
                      }}
                      className="px-3 py-2 rounded-[6px] border border-[#2e3036] bg-[#2a2b30] hover:border-[#9ca3af] text-xs font-medium text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer shrink-0 btn-press"
                      title="Ganti atau Sinkronkan ID"
                    >
                      Sinkron
                    </button>
                  </div>
                </div>

                {/* Browser / Native Push Notifications */}
                <div className="pt-3 border-t border-[#2e3036] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-[#9ca3af] uppercase tracking-wider block">
                      Notifikasi Browser & HP
                    </label>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] font-bold ${
                        notificationPermission === "granted"
                          ? "bg-[#4FA36B]/20 text-[#4FA36B] border border-[#4FA36B]/30"
                          : "bg-[#2a2b30] text-[#9ca3af] border border-[#2e3036]"
                      }`}
                    >
                      {notificationPermission === "granted" ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                    Dapatkan bunyi atau getar di bar notifikasi saat komik selesai diterjemahkan atau ada pembaruan versi.
                  </p>
                  {notificationPermission !== "granted" ? (
                    <button
                      onClick={requestNotificationAccess}
                      className="w-full py-2 px-3 rounded-[6px] bg-[#ff6740]/15 hover:bg-[#ff6740]/25 border border-[#ff6740]/30 text-[#ff7e59] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer btn-press"
                    >
                      <Bell className="w-4 h-4 text-[#ff6740]" />
                      <span>Izinkan & Aktifkan Notifikasi HP</span>
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        sendBrowserNotification(
                          "🔔 Tes Notifikasi MangaID",
                          "Fitur notifikasi status bar HP / Laptop berfungsi dengan baik!"
                        )
                      }
                      className="w-full py-2 px-3 rounded-[6px] bg-[#2a2b30] hover:bg-[#2e3036] border border-[#2e3036] text-[#ffffff] text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer btn-press"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#4FA36B]" />
                      <span>Kirim Tes Notifikasi</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="mt-6 w-full py-2.5 min-h-[44px] rounded-[6px] bg-[#ff6740] hover:bg-[#ff7e59] font-semibold text-xs text-white transition-all cursor-pointer btn-press shadow-md shadow-[#ff6740]/20"
              >
                Simpan & Tutup
              </button>
            </div>
          </div>
        )}

        {/* Device Sync Modal */}
        {showSyncModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#202125] border border-[#2e3036] rounded-[8px] max-w-md w-full p-6 shadow-2xl relative animate-scale-in">
              <button
                onClick={() => setShowSyncModal(false)}
                className="absolute top-4 right-4 text-[#9ca3af] hover:text-[#ffffff] transition-colors p-1 rounded-[4px] cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <h3 className="font-display text-base font-bold text-[#ffffff] mb-2">
                Sinkronkan Database Perangkat
              </h3>
              <p className="text-xs text-[#9ca3af] mb-4 leading-relaxed">
                Ingin rak komik di HP dan Laptop saling terhubung? Tempelkan <strong>ID Perangkat</strong> dari perangkat lain di bawah ini.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-[#9ca3af] uppercase tracking-wider block mb-1.5">
                    ID Perangkat Target
                  </label>
                  <input
                    type="text"
                    value={syncIdInput}
                    onChange={(e) => setSyncIdInput(e.target.value)}
                    placeholder="Contoh: dev-xxxx-xxxx"
                    className="w-full px-3 py-2.5 rounded-[6px] bg-[#16161a] border border-[#2e3036] focus:border-[#ff6740] focus:outline-none font-mono text-xs text-[#ffffff] transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleApplySyncId(syncIdInput)}
                    disabled={!syncIdInput.trim()}
                    className="flex-1 py-2.5 rounded-[6px] bg-[#ff6740] hover:bg-[#ff7e59] disabled:opacity-50 font-semibold text-xs text-white transition-all cursor-pointer btn-press shadow-md shadow-[#ff6740]/20"
                  >
                    Terapkan & Muat Rak
                  </button>
                  <button
                    onClick={handleResetDeviceId}
                    className="py-2.5 px-3 rounded-[6px] border border-[#2e3036] hover:border-[#ef4444] hover:text-[#ef4444] text-xs font-mono text-[#9ca3af] transition-all cursor-pointer shrink-0 btn-press"
                    title="Buat ID Perangkat Baru"
                  >
                    Reset Baru
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className={`flex-1 flex flex-col ${view === "reader" ? "" : "pb-20 lg:pb-8"}`}>
          {/* VIEW 1: HOME */}
          {view === "home" && (
            <main className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto flex flex-col animate-fade-in">
              {/* PWA Install Notification Banner */}
              {!isAppInstalled && showInstallBanner && (
                <div className="p-4 rounded-[8px] bg-gradient-to-r from-[#1C1312] via-[#202125] to-[#202125] border border-[#ff6740]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-slide-up">
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="MangaID Logo"
                      className="w-11 h-11 rounded-[8px] object-cover border border-[#ff6740]/40 shadow-sm shrink-0"
                    />
                    <div>
                      <div className="text-sm font-semibold text-[#ffffff] flex items-center gap-2">
                        <span>Pasang MangaID di Layar Utama HP / Laptop</span>
                        <span className="text-[10px] bg-[#ff6740] text-white font-mono px-1.5 py-0.5 rounded font-bold">
                          PWA
                        </span>
                      </div>
                      <p className="text-xs text-[#9ca3af] mt-0.5">
                        Baca manga layar penuh tanpa address bar browser, akses instan, dan lebih ringan.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => setShowInstallBanner(false)}
                      className="text-xs text-[#9ca3af] hover:text-[#ffffff] px-3 py-1.5 rounded-[6px] border border-[#2e3036] bg-[#2a2b30] cursor-pointer transition-colors btn-press"
                    >
                      Nanti Saja
                    </button>
                    <button
                      onClick={handleInstallPWA}
                      className="text-xs font-semibold text-white bg-[#ff6740] hover:bg-[#ff7e59] px-4 py-1.5 rounded-[6px] transition-all flex items-center gap-1.5 shadow-md shadow-[#ff6740]/20 cursor-pointer btn-press"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install Sekarang
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 1: JELAJAH (HOMEPAGE AUTENTIK MANGADEX) */}
              {activeNavTab === "jelajah" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Top Source Provider Switcher */}
                  <div className="bg-[#202125] border border-[#2e3036] rounded-[8px] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                      <span className="text-xs font-mono text-[#9ca3af] flex-shrink-0">Pilih Web:</span>
                      {[
                        { id: "mangadex", label: "MangaDex (Official Global)", icon: "🌐" },
                        { id: "komikindo", label: "Komik Indo (Sub Indo)", icon: "🇮🇩" },
                        { id: "nhentai", label: "nhentai (Doujinshi 18+)", icon: "🔞" },
                        { id: "raw", label: "RAW Manga (Jepang / Korea)", icon: "🇯🇵" },
                      ].map((src) => (
                        <button
                          key={src.id}
                          type="button"
                          onClick={() => handleSwitchSource(src.id as any)}
                          className={`px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer btn-press border ${
                            explorerSource === src.id
                              ? "bg-[#ff6740] border-[#ff6740] text-white shadow-sm shadow-[#ff6740]/25"
                              : "bg-[#191a1c] border-[#2e3036] text-[#9ca3af] hover:text-white hover:border-[#9ca3af]/50"
                          }`}
                        >
                          <span>{src.icon}</span>
                          <span>{src.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleSearchManga("", explorerSource, [])}
                        disabled={explorerLoading}
                        className="text-xs font-mono text-[#9ca3af] hover:text-white px-2.5 py-1.5 rounded-[6px] border border-[#2e3036] bg-[#191a1c] hover:bg-[#2a2b30] transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Segarkan Katalog Populer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${explorerLoading ? "animate-spin text-[#ff6740]" : ""}`} />
                        <span>Refresh Populer</span>
                      </button>
                    </div>
                  </div>

                  {/* MangaDex Featured Hero Carousel */}
                  {explorerResults.length > 0 && !explorerQuery.trim() && selectedGenres.length === 0 && (
                    <div className="relative rounded-[10px] overflow-hidden border border-[#2e3036] bg-[#191a1c] shadow-2xl group min-h-[340px] sm:min-h-[380px]">
                      {/* Blurred Backdrop */}
                      {explorerResults[carouselIdx]?.cover_url && (
                        <div
                          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-125 transition-all duration-700 pointer-events-none"
                          style={{ backgroundImage: `url(${resolveProxyImage(explorerResults[carouselIdx]?.cover_url)})` }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#191a1c] via-[#191a1c]/80 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#191a1c] via-[#191a1c]/80 to-transparent pointer-events-none" />

                      {/* Content */}
                      <div className="relative z-10 p-5 sm:p-7 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6">
                        {/* 7:10 Cover Poster */}
                        <div
                          onClick={() => explorerResults[carouselIdx] && handleSelectManga(explorerResults[carouselIdx])}
                          className="aspect-[7/10] w-32 sm:w-44 md:w-48 shrink-0 rounded-[8px] overflow-hidden border border-white/10 shadow-2xl relative cursor-pointer group/poster"
                        >
                          {explorerResults[carouselIdx]?.cover_url && (
                            <img
                              src={resolveProxyImage(explorerResults[carouselIdx]?.cover_url)}
                              alt={explorerResults[carouselIdx]?.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover/poster:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (target.src.includes("/api/proxy/image?url=")) {
                                  try {
                                    const raw = decodeURIComponent(target.src.split("/api/proxy/image?url=")[1]);
                                    if (raw && target.src !== raw) target.src = raw;
                                  } catch {}
                                }
                              }}
                            />
                          )}
                          {explorerResults[carouselIdx]?.status && (
                            <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                              explorerResults[carouselIdx]?.status?.toLowerCase().includes("complete")
                                ? "bg-blue-600/90 text-white"
                                : explorerResults[carouselIdx]?.status?.toLowerCase().includes("18+")
                                ? "bg-rose-600/90 text-white"
                                : "bg-emerald-600/90 text-white"
                            }`}>
                              {explorerResults[carouselIdx]?.status}
                            </div>
                          )}
                        </div>

                        {/* Info Column */}
                        <div className="flex-1 flex flex-col justify-between text-center md:text-left min-w-0">
                          <div>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#ff6740]/20 text-[#ff6740] border border-[#ff6740]/30 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>POPULER #{carouselIdx + 1}</span>
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#202125] border border-[#2e3036] text-[#9ca3af]">
                                {explorerSource === "nhentai" ? "🔞 nhentai" : explorerSource === "raw" ? "🇯🇵 RAW" : explorerSource === "komikindo" ? "🇮🇩 Komik Indo" : "🌐 MangaDex"}
                              </span>
                              {explorerResults[carouselIdx]?.year && (
                                <span className="text-[10px] text-[#9ca3af] font-mono">Tahun {explorerResults[carouselIdx]?.year}</span>
                              )}
                            </div>

                            <h2
                              onClick={() => explorerResults[carouselIdx] && handleSelectManga(explorerResults[carouselIdx])}
                              className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white line-clamp-2 hover:text-[#ff6740] transition-colors cursor-pointer leading-tight mb-2.5"
                              title={explorerResults[carouselIdx]?.title}
                            >
                              {explorerResults[carouselIdx]?.title}
                            </h2>

                            {/* Tags */}
                            {explorerResults[carouselIdx]?.tags && explorerResults[carouselIdx]?.tags.length > 0 && (
                              <div className="flex items-center justify-center md:justify-start gap-1.5 flex-wrap mb-3">
                                {explorerResults[carouselIdx]?.tags.slice(0, 5).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#202125] border border-[#2e3036] text-[#9ca3af]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Synopsis */}
                            <p className="text-xs sm:text-sm text-[#9ca3af] line-clamp-3 sm:line-clamp-4 leading-relaxed mb-6">
                              {explorerResults[carouselIdx]?.description || "Klik tombol di bawah untuk membaca bab lengkap atau menerjemahkan otomatis ke bahasa Indonesia."}
                            </p>
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center justify-center md:justify-start gap-3">
                            <button
                              onClick={() => explorerResults[carouselIdx] && handleSelectManga(explorerResults[carouselIdx])}
                              className="px-5 py-2.5 rounded-[6px] bg-[#ff6740] hover:bg-[#ff7e59] text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-[#ff6740]/25 btn-press"
                            >
                              <BookOpen className="w-4 h-4" />
                              <span>Mulai Baca / Lihat Daftar Bab</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Chevrons */}
                      {explorerResults.slice(0, 5).length > 1 && (
                        <>
                          <button
                            onClick={() => setCarouselIdx((prev) => (prev - 1 + Math.min(5, explorerResults.length)) % Math.min(5, explorerResults.length))}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 transition-all cursor-pointer z-20"
                            title="Sebelumnya"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setCarouselIdx((prev) => (prev + 1) % Math.min(5, explorerResults.length))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 transition-all cursor-pointer z-20"
                            title="Berikutnya"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>

                          {/* Dots */}
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                            {explorerResults.slice(0, 5).map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setCarouselIdx(i)}
                                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                  carouselIdx === i ? "w-6 bg-[#ff6740]" : "w-1.5 bg-[#9ca3af]/40 hover:bg-[#9ca3af]"
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Explore Search & Filter Toolbar */}
                  <div className="bg-[#202125] border border-[#2e3036] rounded-[8px] p-4 sm:p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[#9ca3af] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder={
                            explorerSource === "raw"
                              ? "Cari judul manga RAW Jepang/Korea atau pilih genre..."
                              : explorerSource === "nhentai"
                              ? "Cari doujinshi (judul atau kode) atau pilih genre..."
                              : explorerSource === "komikindo"
                              ? "Cari komik bahasa Indonesia atau pilih genre..."
                              : "Cari manga di MangaDex global atau pilih genre..."
                          }
                          value={explorerQuery}
                          onChange={(e) => setExplorerQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSearchManga();
                            }
                          }}
                          className="w-full pl-10 pr-10 py-2.5 rounded-[6px] bg-[#191a1c] border border-[#2e3036] focus:border-[#ff6740] focus:outline-none text-white placeholder-[#9ca3af]/60 text-xs sm:text-sm transition-colors font-mono"
                        />
                        {explorerQuery && (
                          <button
                            onClick={() => {
                              setExplorerQuery("");
                              handleSearchManga("", explorerSource, selectedGenres);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSearchManga()}
                        disabled={explorerLoading}
                        className="px-6 py-2.5 rounded-[6px] bg-[#ff6740] hover:bg-[#ff7e59] text-white font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#ff6740]/20 btn-press"
                      >
                        {explorerLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>Cari</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick Genre Pills + Full Genre Modal Toggle */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-[#9ca3af] font-mono mr-1">Genre:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGenres([]);
                          handleSearchManga(explorerQuery, explorerSource, []);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                          selectedGenres.length === 0
                            ? "bg-[#ff6740] border-[#ff6740] text-white shadow-sm"
                            : "bg-[#191a1c] border-[#2e3036] text-[#9ca3af] hover:text-white"
                        }`}
                      >
                        Semua
                      </button>

                      {(explorerSource === "nhentai"
                        ? ["Romance", "School", "Comedy", "Color", "English", "Vanilla", "Big Breasts"]
                        : ["Action", "Romance", "Fantasy", "Comedy", "Isekai", "Slice of Life", "Drama", "Supernatural", "Martial Arts", "Horror"]
                      ).map((genre) => {
                        const isSelected = selectedGenres.includes(genre);
                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => {
                              const next = isSelected ? selectedGenres.filter((g) => g !== genre) : [...selectedGenres, genre];
                              setSelectedGenres(next);
                              handleSearchManga(explorerQuery, explorerSource, next);
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-[#ff6740] border-[#ff6740] text-white font-semibold shadow-sm"
                                : "bg-[#191a1c] border-[#2e3036] text-[#9ca3af] hover:text-white hover:border-[#9ca3af]/40"
                            }`}
                          >
                            {genre}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setShowGenreSearch(!showGenreSearch)}
                        className="px-3 py-1 rounded-full bg-[#2a2b30] border border-[#2e3036] text-[#9ca3af] hover:text-white hover:border-[#ff6740]/60 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-[#ff6740]" />
                        <span>{showGenreSearch ? "Tutup Filter" : `Semua Genre (${visibleGenres.length})`}</span>
                      </button>
                    </div>

                    {/* Full Genre Dropdown Panel */}
                    {showGenreSearch && (
                      <div className="pt-3 border-t border-[#2e3036] space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono text-[#9ca3af]">Daftar Lengkap Genre ({visibleGenres.length} genre):</span>
                          {selectedGenres.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGenres([]);
                                handleSearchManga(explorerQuery, explorerSource, []);
                              }}
                              className="text-[11px] text-[#ff6740] hover:underline cursor-pointer"
                            >
                              Reset Pilihan ({selectedGenres.length})
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Ketik untuk memfilter genre..."
                            value={genreSearchInput}
                            onChange={(e) => setGenreSearchInput(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[6px] bg-[#191a1c] border border-[#2e3036] focus:border-[#ff6740] focus:outline-none text-white placeholder-[#9ca3af]/50"
                          />
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {visibleGenres.map((genre) => {
                            const isSelected = selectedGenres.includes(genre);
                            return (
                              <button
                                key={genre}
                                type="button"
                                onClick={() => {
                                  const next = isSelected ? selectedGenres.filter((g) => g !== genre) : [...selectedGenres, genre];
                                  setSelectedGenres(next);
                                  handleSearchManga(explorerQuery, explorerSource, next);
                                }}
                                className={`px-2.5 py-1 rounded-[4px] text-[11px] transition-all cursor-pointer border ${
                                  isSelected
                                    ? "bg-[#ff6740] border-[#ff6740] text-white font-semibold"
                                    : "bg-[#191a1c] border-[#2e3036] text-[#9ca3af] hover:text-white"
                                }`}
                              >
                                {genre}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Catalog Grid */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <span>
                            {explorerQuery.trim()
                              ? `Hasil Pencarian: "${explorerQuery}"`
                              : selectedGenres.length > 0
                              ? `Filter Genre: ${selectedGenres.join(", ")}`
                              : `🔥 Manga Terpopuler (${explorerSource === "nhentai" ? "nhentai" : explorerSource === "raw" ? "RAW Manga" : explorerSource === "komikindo" ? "Komik Indo" : "MangaDex"})`}
                          </span>
                        </h3>
                        <span className="text-xs text-[#9ca3af] font-mono">
                          {filteredExplorerResults.length} judul manga ditemukan
                        </span>
                      </div>
                    </div>

                    {explorerLoading ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#9ca3af] animate-fade-in">
                        <RefreshCw className="w-8 h-8 animate-spin text-[#ff6740]" />
                        <span className="text-xs font-mono animate-pulse-subtle">
                          Memuat katalog manga terpopuler...
                        </span>
                      </div>
                    ) : filteredExplorerResults.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 animate-fade-in">
                        {filteredExplorerResults.map((manga) => (
                          <div
                            key={manga.id}
                            onClick={() => handleSelectManga(manga)}
                            className="group flex flex-col rounded-[8px] border border-[#2e3036] bg-[#202125] hover:border-[#ff6740]/60 overflow-hidden card-lift cursor-pointer transition-all duration-200"
                          >
                            {/* 7:10 Cover Poster */}
                            <div className="aspect-[7/10] relative bg-[#2a2b30] overflow-hidden">
                              {manga.cover_url ? (
                                <img
                                  src={resolveProxyImage(manga.cover_url)}
                                  alt={manga.title}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    if (target.src.includes("/api/proxy/image?url=")) {
                                      try {
                                        const raw = decodeURIComponent(target.src.split("/api/proxy/image?url=")[1]);
                                        if (raw && target.src !== raw) target.src = raw;
                                      } catch {}
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-[#9ca3af]">
                                  <BookOpen className="w-8 h-8 mb-1.5 opacity-40" />
                                  <span className="text-[10px]">{manga.title}</span>
                                </div>
                              )}

                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                              {manga.status && (
                                <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${
                                  manga.status.toLowerCase().includes("complete")
                                    ? "bg-blue-600/90 text-white"
                                    : manga.status.toLowerCase().includes("18+")
                                    ? "bg-rose-600/90 text-white"
                                    : "bg-emerald-600/90 text-white"
                                }`}>
                                  {manga.status}
                                </div>
                              )}

                              {manga.source && (
                                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide border border-white/10 bg-black/75 backdrop-blur text-white shadow-sm">
                                  {manga.source === "nhentai" ? "🔞 nhentai" : manga.source === "raw" ? "🇯🇵 RAW" : manga.source === "komikindo" ? "🇮🇩 Komik Indo" : "🌐 MangaDex"}
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="p-3 flex-1 flex flex-col justify-between">
                              <div>
                                <h4
                                  className="text-xs sm:text-sm font-semibold text-white line-clamp-2 group-hover:text-[#ff6740] transition-colors leading-snug"
                                  title={manga.title}
                                >
                                  {manga.title}
                                </h4>
                                <div className="flex items-center gap-1 flex-wrap mt-2">
                                  {manga.year && (
                                    <span className="text-[10px] text-[#9ca3af] font-mono mr-1">{manga.year}</span>
                                  )}
                                  {manga.tags.slice(0, 2).map((t) => (
                                    <span
                                      key={t}
                                      className="px-1.5 py-0.2 rounded text-[9px] bg-[#2a2b30] text-[#9ca3af]"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <button
                                type="button"
                                className="mt-2.5 w-full py-1.5 px-2 rounded-[4px] bg-[#2a2b30] group-hover:bg-[#ff6740] text-white text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm"
                              >
                                <BookOpen className="w-3 h-3" />
                                <span>Lihat Bab</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center rounded-[8px] border border-[#2e3036] bg-[#202125] text-[#9ca3af] text-xs">
                        Tidak ada komik yang ditemukan. Coba ganti kata kunci atau pilih genre lain.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PENERJEMAH (STUDIO TRANSLASI DEDIKASI) */}
              {activeNavTab === "penerjemah" && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Languages className="w-6 h-6 text-[#ff6740]" />
                      <span>Studio Penerjemah Komik AI</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-[#9ca3af] mt-1">
                      Terjemahkan bab komik langsung dari link web manga atau unggah berkas arsip Anda (CBZ, ZIP, PDF) ke Bahasa Indonesia secara instan.
                    </p>
                  </div>

                  {/* Main Translation Card */}
                  <div className="bg-[#202125] border border-[#2e3036] rounded-[8px] p-5 sm:p-6 shadow-sm">
                    {/* Mode Switcher */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2e3036] mb-6">
                      <div className="flex items-center gap-4 sm:gap-6">
                        <button
                          onClick={() => setTranslatorMode("url")}
                          className={`pb-2 text-xs font-semibold tracking-wide transition-all relative cursor-pointer ${
                            translatorMode === "url"
                              ? "text-white border-b-2 border-[#ff6740] -mb-[18px]"
                              : "text-[#9ca3af] hover:text-white"
                          }`}
                        >
                          Tempel Link URL Web
                        </button>
                        <button
                          onClick={() => setTranslatorMode("upload")}
                          className={`pb-2 text-xs font-semibold tracking-wide transition-all relative cursor-pointer ${
                            translatorMode === "upload"
                              ? "text-white border-b-2 border-[#ff6740] -mb-[18px]"
                              : "text-[#9ca3af] hover:text-white"
                          }`}
                        >
                          Upload Berkas Komik (CBZ/ZIP/PDF)
                        </button>
                      </div>

                      {/* Tone Switcher */}
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-mono text-[#9ca3af] hover:text-white px-3 py-1.5 rounded-[6px] border border-[#2e3036] bg-[#2a2b30] hover:border-[#9ca3af]/50 transition-all cursor-pointer btn-press"
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#ff6740]" strokeWidth={1.5} />
                        <span>
                          Gaya: <strong className="text-white font-semibold capitalize">{tone}</strong>
                        </span>
                      </button>
                    </div>

                    {/* Mode 1: URL Form */}
                    {translatorMode === "url" ? (
                      <div className="space-y-4">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleIngestUrl(e);
                          }}
                          className="flex flex-col sm:flex-row gap-2"
                        >
                          <div className="relative flex-1">
                            <LinkIcon className="w-4 h-4 text-[#9ca3af] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                            <input
                              type="text"
                              required
                              placeholder="https://... atau kode doujinshi (contoh: 177013)"
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-[6px] bg-[#191a1c] border border-[#2e3036] focus:border-[#ff6740] focus:outline-none text-white placeholder-[#9ca3af]/60 text-sm transition-colors font-mono"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleIngestUrl()}
                            disabled={loading || !urlInput.trim()}
                            className={`px-6 py-3 min-h-[44px] rounded-[6px] font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 flex-shrink-0 btn-press ${
                              urlInput.trim() && !loading
                                ? "bg-[#ff6740] hover:bg-[#ff7e59] text-white cursor-pointer shadow-md shadow-[#ff6740]/20"
                                : "bg-[#2a2b30] border border-[#2e3036] text-[#9ca3af] cursor-not-allowed"
                            }`}
                          >
                            {loading ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                                <span>Memindai...</span>
                              </>
                            ) : (
                              <>
                                <span>Analisis & Terjemahkan</span>
                                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </>
                            )}
                          </button>
                        </form>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-[#9ca3af]">
                          <span>Mendukung: MangaDex, Komikindo, Kiryuu, Manganato, nhentai, dsb.</span>
                          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                            <span className="text-[11px] text-[#9ca3af]">Contoh cepat:</span>
                            <button
                              type="button"
                              onClick={() => setUrlInput(SAMPLE_URL)}
                              className="text-[#9ca3af] hover:text-white underline underline-offset-2 transition-colors cursor-pointer text-[11px]"
                            >
                              MangaDex
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => setUrlInput("177013")}
                              className="text-[#9ca3af] hover:text-[#ff7e59] underline underline-offset-2 transition-colors cursor-pointer text-[11px]"
                            >
                              nhentai #177013
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => setUrlInput("https://komikindo.tv/one-piece-chapter-1100-bahasa-indonesia/")}
                              className="text-[#9ca3af] hover:text-white underline underline-offset-2 transition-colors cursor-pointer text-[11px]"
                            >
                              Komikindo
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Mode 2: Manual Upload Form */
                      <form onSubmit={handleManualUpload} className="space-y-4">
                        <div className="border border-dashed border-[#2e3036] hover:border-[#ff6740]/60 rounded-[8px] p-8 bg-[#191a1c] text-center transition-colors">
                          <FileArchive className="w-8 h-8 text-[#ff6740] mx-auto mb-2" strokeWidth={1.5} />
                          <h4 className="text-sm font-semibold text-white mb-1">
                            Pilih file gambar, ZIP, CBZ, atau PDF
                          </h4>
                          <p className="text-xs text-[#9ca3af] mb-4">
                            Gunakan opsi ini jika file ada di komputer Anda atau situs sumber terproteksi
                          </p>
                          <input
                            type="file"
                            multiple
                            accept=".zip,.cbz,.pdf,image/png,image/jpeg,image/webp"
                            onChange={(e) => setSelectedFiles(e.target.files)}
                            className="block mx-auto text-xs text-[#9ca3af] file:mr-3 file:py-1.5 file:px-3 file:rounded-[4px] file:border-0 file:text-xs file:font-semibold file:bg-[#2a2b30] file:text-white hover:file:bg-[#2e3036] cursor-pointer"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Judul chapter (opsional)"
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            className="flex-1 px-4 py-2.5 min-h-[44px] rounded-[6px] bg-[#191a1c] border border-[#2e3036] focus:border-[#ff6740] focus:outline-none text-white placeholder-[#9ca3af]/60 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={loading || !selectedFiles || selectedFiles.length === 0}
                            className={`px-5 py-2.5 min-h-[44px] rounded-[6px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 flex-shrink-0 btn-press ${
                              selectedFiles && selectedFiles.length > 0 && !loading
                                ? "bg-[#ff6740] hover:bg-[#ff7e59] text-white cursor-pointer shadow-md shadow-[#ff6740]/20"
                                : "bg-[#2a2b30] border border-[#2e3036] text-[#9ca3af] cursor-not-allowed"
                            }`}
                          >
                            {loading ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                                <span>Memproses...</span>
                              </>
                            ) : (
                              "Unggah & Lanjut"
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Guide & Technology Card */}
                  <div className="bg-[#202125] border border-[#2e3036] rounded-[8px] p-5 text-xs text-[#9ca3af] space-y-3">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#ff6740]" />
                      <span>Keunggulan Mesin AI MangaID</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      <div className="p-3 rounded-[6px] bg-[#191a1c] border border-[#2e3036]">
                        <div className="font-semibold text-white mb-1">🎯 Deteksi Gelembung & Teks Cerdas</div>
                        <div>Mendeteksi balon teks vertikal dan horizontal Jepang/Korea secara presisi tanpa merusak ilustrasi latar.</div>
                      </div>
                      <div className="p-3 rounded-[6px] bg-[#191a1c] border border-[#2e3036]">
                        <div className="font-semibold text-white mb-1">💬 Bahasa Alami & Kontekstual</div>
                        <div>Terjemahan santai/gaul khas komik Indonesia dengan mempertahankan honorifik dan nuansa emosional cerita.</div>
                      </div>
                      <div className="p-3 rounded-[6px] bg-[#191a1c] border border-[#2e3036]">
                        <div className="font-semibold text-white mb-1">🎧 Narasi Suara Audiobook</div>
                        <div>Dengarkan narasi suara AI otomatis per slide halaman untuk pengalaman membaca santai tanpa lelah mata.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: KOLEKSI (HALAMAN PERPUSTAKAAN DEDIKASI) */}
              {activeNavTab === "koleksi" && (
                <div id="bab-tersimpan-section" className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-[#ff6740]" />
                      <span>Koleksi & Riwayat Baca Saya</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-[#9ca3af] mt-1">
                      Semua judul manga dan bab yang telah Anda simpan dan terjemahkan, tersimpan permanen di database lokal perangkat Anda.
                    </p>
                  </div>

                  {/* 3 Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-4 rounded-[8px] bg-[#202125] border border-[#2e3036] flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-[6px] bg-[#ff6740]/15 flex items-center justify-center text-[#ff6740]">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xl font-extrabold text-white">{filteredSeries.length}</div>
                        <div className="text-xs text-[#9ca3af]">Total Seri Manga</div>
                      </div>
                    </div>
                    <div className="p-4 rounded-[8px] bg-[#202125] border border-[#2e3036] flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-[6px] bg-blue-500/15 flex items-center justify-center text-blue-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xl font-extrabold text-white">{savedChapters.length}</div>
                        <div className="text-xs text-[#9ca3af]">Total Bab Tersimpan</div>
                      </div>
                    </div>
                    <div className="p-4 rounded-[8px] bg-[#202125] border border-[#2e3036] flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-[6px] bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xl font-extrabold text-white">{totalRenderedPagesAll}</div>
                        <div className="text-xs text-[#9ca3af]">Halaman Selesai Diterjemahkan</div>
                      </div>
                    </div>
                  </div>

                  {/* Controls Toolbar: Search, Filter, Export/Import */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#202125] border border-[#2e3036] rounded-[8px]">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Cari judul seri manga..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[6px] bg-[#191a1c] border border-[#2e3036] focus:border-[#ff6740] focus:outline-none text-white placeholder-[#9ca3af]/60"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="py-1.5 px-3 text-xs rounded-[6px] bg-[#191a1c] border border-[#2e3036] text-white focus:border-[#ff6740] focus:outline-none cursor-pointer"
                      >
                        <option value="all">Semua Status</option>
                        <option value="done">Selesai 100%</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleExportHistory}
                        title="Unduh backup riwayat & database komik Anda (JSON)"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#2a2b30] border border-[#2e3036] hover:border-[#9ca3af] text-white text-xs font-mono transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-[#ff6740]" />
                        <span>Backup JSON</span>
                      </button>

                      <label
                        title="Pulihkan database riwayat komik dari file backup JSON"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#2a2b30] border border-[#2e3036] hover:border-[#ff6740] text-white text-xs font-mono transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#ff6740]" />
                        <span>Pulihkan</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportHistory}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setShowSyncModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#2a2b30] border border-[#2e3036] hover:border-[#ff6740] text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Sinkronisasi ID Perangkat"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-[#9ca3af]" />
                        <span>Sinkron ID</span>
                      </button>
                    </div>
                  </div>

                  {/* Series Grid */}
                  {filteredSeries.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                      {filteredSeries.map((series) => (
                        <div
                          key={series.title}
                          className="group flex flex-col bg-[#202125] border border-[#2e3036] rounded-[8px] overflow-hidden card-lift"
                        >
                          <div
                            onClick={() => setSelectedSeries(series)}
                            className="aspect-[7/10] bg-[#2a2b30] relative overflow-hidden flex items-center justify-center cursor-pointer"
                          >
                            <img
                              src={`${BACKEND_URL}/api/chapters/${series.coverChapterId}/pages/1/original`}
                              alt={series.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[4px] bg-black/80 border border-white/10 font-mono text-[10px] text-white flex items-center gap-1 shadow-sm">
                              <Layers className="w-3 h-3 text-[#ff6740]" />
                              <span>{series.totalChapters} Bab</span>
                            </div>
                          </div>

                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <h4
                                  onClick={() => setSelectedSeries(series)}
                                  className="text-xs font-bold text-white truncate flex-1 cursor-pointer hover:text-[#ff6740] transition-colors"
                                  title={series.title}
                                >
                                  {series.title}
                                </h4>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRename({
                                      type: "series",
                                      oldTitle: series.title,
                                      currentTitle: series.title,
                                    });
                                  }}
                                  className="text-[#9ca3af] hover:text-white p-0.5 transition-colors cursor-pointer btn-press"
                                  title="Ubah Nama Seri"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="font-mono text-[11px] text-[#9ca3af] mt-0.5">
                                {series.totalRenderedPages}/{series.totalPages} hal selesai
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#2e3036]">
                              <button
                                onClick={() => setSelectedSeries(series)}
                                className="flex-1 min-h-[34px] py-1 px-2 rounded-[6px] bg-[#ff6740] hover:bg-[#ff7e59] text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 btn-press shadow-sm"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Buka Bab ({series.totalChapters})</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({
                                    type: "series",
                                    title: series.title,
                                    count: series.totalChapters,
                                  });
                                }}
                                className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-[6px] border border-[#2e3036] hover:border-[#ef4444]/60 hover:bg-[#ef4444]/10 text-[#9ca3af] hover:text-[#ef4444] transition-all cursor-pointer btn-press"
                                title="Hapus Seluruh Seri"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center rounded-[8px] border border-[#2e3036] bg-[#202125] text-[#9ca3af] flex flex-col items-center justify-center gap-3">
                      <BookOpen className="w-10 h-10 opacity-30 text-[#9ca3af]" />
                      <div className="text-sm font-semibold text-white">Belum ada seri manga di koleksi Anda</div>
                      <p className="text-xs text-[#9ca3af] max-w-sm">
                        Manga yang Anda baca di tab Jelajah atau terjemahkan di tab Penerjemah akan otomatis tersimpan di sini.
                      </p>
                      <button
                        onClick={() => setActiveNavTab("jelajah")}
                        className="mt-2 px-4 py-2 rounded-[6px] bg-[#ff6740] hover:bg-[#ff7e59] text-white text-xs font-semibold cursor-pointer btn-press shadow-md"
                      >
                        Mulai Jelajahi Manga Populer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </main>
          )}

      {/* VIEW 2: REVIEW DETECTED PAGES */}
      {view === "review" && ingestResult && (
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-6 pb-4 border-b border-[#2e3036]">
            <div>
              <h2 className="font-display text-xl font-bold text-[#ffffff]">
                {ingestResult.title || "Chapter Manga"} — Bab {ingestResult.chapter_number || "1"}
              </h2>
              <div className="font-mono text-xs text-[#9ca3af] mt-1">
                {reviewPages.length} halaman terdeteksi • Ekstraksi: {ingestResult.layer_used}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("home")}
                className="px-3.5 py-2 min-h-[40px] rounded-[6px] border border-[#2e3036] text-xs font-medium text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer flex items-center justify-center btn-press"
              >
                Batal
              </button>
              <button
                onClick={handleStartTranslation}
                disabled={loading || reviewPages.length === 0}
                className={`px-4 py-2 min-h-[40px] rounded-[6px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 btn-press ${
                  reviewPages.length > 0 && !loading
                    ? "bg-[#ff6740] hover:bg-[#ff7e59] text-white cursor-pointer shadow-md shadow-[#ff6740]/20"
                    : "bg-[#2a2b30] border border-[#2e3036] text-[#9ca3af] cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                    <span>Memulai...</span>
                  </>
                ) : (
                  `Mulai Terjemahkan (${tone})`
                )}
              </button>
            </div>
          </div>

          {/* Grid of Thumbnails */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {reviewPages.map((imgUrl, idx) => (
              <div
                key={idx}
                className="group relative bg-[#202125] border border-[#2e3036] hover:border-[#ff6740] rounded-[6px] overflow-hidden transition-all flex flex-col card-lift"
              >
                <div className="aspect-[3/4] bg-[#2a2b30] overflow-hidden relative">
                  <img
                    src={resolveProxyImage(imgUrl)}
                    alt={`Halaman ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[3px] bg-[#191a1c]/85 font-mono text-[10px] text-[#ffffff]">
                    #{idx + 1}
                  </span>
                </div>

                <div className="p-1.5 bg-[#202125] border-t border-[#2e3036] flex items-center justify-between text-xs">
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => movePage(idx, "left")}
                      disabled={idx === 0}
                      className="p-1 text-[#9ca3af] hover:text-[#ffffff] disabled:opacity-20 cursor-pointer btn-press"
                      title="Geser Kiri"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => movePage(idx, "right")}
                      disabled={idx === reviewPages.length - 1}
                      className="p-1 text-[#9ca3af] hover:text-[#ffffff] disabled:opacity-20 cursor-pointer btn-press"
                      title="Geser Kiri"
                    >
                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>

                  <button
                    onClick={() => removePage(idx)}
                    className="p-1 text-[#9ca3af] hover:text-[#ef4444] cursor-pointer btn-press"
                    title="Hapus Halaman"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* VIEW 3: PROGRESS */}
      {view === "progress" && (
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-16 flex flex-col items-center justify-center animate-fade-in">
          <div className="w-full max-w-md bg-[#202125] border border-[#2e3036] rounded-[8px] p-6 shadow-2xl animate-scale-in">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-display text-base font-bold text-[#ffffff]">
                Memproses Terjemahan
              </h3>
              <span className="font-mono text-xs text-[#ff6740] uppercase animate-pulse-subtle font-semibold">
                {jobStatus?.stage || "MENYIAPKAN"}
              </span>
            </div>

            {/* Flat Thin Vermilion Progress Bar with Running Light Shimmer */}
            <div className="w-full bg-[#2a2b30] h-2 rounded-[4px] overflow-hidden my-4 border border-[#2e3036]/60">
              <div
                className="shimmer-progress h-full transition-all duration-300 rounded-[3px]"
                style={{
                  width: `${
                    jobStatus?.total_pages
                      ? Math.round(
                          ((jobStatus.completed_pages || jobStatus.current_page || 1) /
                            jobStatus.total_pages) *
                            100
                        )
                      : 15
                  }%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-[#9ca3af]">
              <span>
                {jobStatus?.stage === "rendering"
                  ? `Render: ${jobStatus.completed_pages} / ${jobStatus.total_pages}`
                  : `Halaman: ${jobStatus?.current_page || 1} / ${jobStatus?.total_pages || "?"}`}
              </span>
              <span className="text-[#ffffff] font-semibold">
                {jobStatus?.total_pages
                  ? `${Math.round(
                      ((jobStatus.completed_pages || jobStatus.current_page || 1) /
                        jobStatus.total_pages) *
                        100
                    )}%`
                  : "0%"}
              </span>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-[6px] bg-[#2a2b30] border border-[#ef4444] text-[#ffffff] text-xs animate-slide-up">
                {errorMsg}
              </div>
            )}
          </div>
        </main>
      )}

      {/* VIEW 4: MANGA READER (WEBTOON CONTINUOUS SCROLL OR SINGLE PAGE SLIDE) */}
      {view === "reader" && chapterData && (
        <div className="flex-1 flex flex-col bg-[#191a1c] animate-fade-in">
          {/* Reader Sticky Header */}
          <header className="sticky top-0 z-50 bg-[#191a1c]/95 backdrop-blur-md border-b border-[#2e3036] py-2 sm:py-2.5">
            <div className="max-w-6xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3">
              {/* Left: Back & Chapter Navigation */}
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.history.pushState({}, "", window.location.pathname);
                    }
                    loadSavedChapters();
                    setView("home");
                  }}
                  className="min-h-[32px] sm:min-h-[36px] text-xs text-[#9ca3af] hover:text-[#ffffff] flex items-center gap-1 font-mono transition-colors cursor-pointer flex-shrink-0 btn-press"
                  title="Kembali ke Beranda"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                  <span className="hidden sm:inline">Kembali</span>
                </button>

                <div className="h-3.5 w-px bg-[#2e3036] flex-shrink-0" />

                {/* Chapter Quick Arrows & Title */}
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <button
                    disabled={!readerNav.prevChapter}
                    onClick={() => readerNav.prevChapter && fetchChapter(readerNav.prevChapter.id)}
                    className="p-1 sm:p-1.5 rounded-[4px] border border-[#2e3036] bg-[#202125] hover:bg-[#2a2b30] text-[#9ca3af] hover:text-[#ffffff] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer flex-shrink-0"
                    title={
                      readerNav.prevChapter
                        ? `Bab Sebelumnya (Bab ${readerNav.prevChapter.chapter_number || "Sebelumnya"})`
                        : "Tidak ada bab sebelumnya"
                    }
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <h3 className="font-display font-bold text-[#ffffff] text-xs truncate max-w-[110px] sm:max-w-xs md:max-w-md">
                    {chapterData.title || "Manga"} — Bab {chapterData.chapter_number || "1"}
                  </h3>

                  <button
                    disabled={!readerNav.nextChapter}
                    onClick={() => readerNav.nextChapter && fetchChapter(readerNav.nextChapter.id)}
                    className="p-1 sm:p-1.5 rounded-[4px] border border-[#2e3036] bg-[#202125] hover:bg-[#2a2b30] text-[#9ca3af] hover:text-[#ffffff] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer flex-shrink-0"
                    title={
                      readerNav.nextChapter
                        ? `Bab Berikutnya (Bab ${readerNav.nextChapter.chapter_number || "Berikutnya"})`
                        : "Tidak ada bab berikutnya"
                    }
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() =>
                      handleOpenRename({
                        type: "chapter",
                        id: chapterData.id,
                        currentTitle: chapterData.title || "",
                        currentChapterNumber: chapterData.chapter_number || "1",
                      })
                    }
                    className="p-1 rounded text-[#9ca3af] hover:text-[#ffffff] hover:bg-[#2a2b30] transition-colors cursor-pointer flex-shrink-0"
                    title="Ganti Nama / Nomor Bab"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Mobile Right Controls: Compact, Clean & Thumb-Friendly */}
              <div className="flex sm:hidden items-center gap-1.5 flex-shrink-0">
                {/* Segmented Flat Toggle: Terjemahan vs Asli */}
                <div className="flex items-center bg-[#202125] p-0.5 rounded-[6px] border border-[#2e3036]">
                  <button
                    onClick={() => setShowTranslated(true)}
                    className={`min-h-[28px] px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition-colors cursor-pointer ${
                      showTranslated
                        ? "bg-[#ff6740] text-white font-semibold shadow-sm"
                        : "text-[#9ca3af] hover:text-[#ffffff]"
                    }`}
                  >
                    ID
                  </button>
                  <button
                    onClick={() => setShowTranslated(false)}
                    className={`min-h-[28px] px-2 py-0.5 rounded-[4px] text-[11px] font-medium transition-colors cursor-pointer ${
                      !showTranslated
                        ? "bg-[#ff6740] text-white font-semibold shadow-sm"
                        : "text-[#9ca3af] hover:text-[#ffffff]"
                    }`}
                  >
                    Asli
                  </button>
                </div>

                {/* Mobile Menu Button - Opens Sleek Bottom Sheet */}
                <button
                  onClick={() => setShowMobileReaderMenu(true)}
                  className="flex items-center gap-1 min-h-[30px] px-2.5 py-1 rounded-[6px] border border-[#2e3036] bg-[#161617] hover:bg-[#202022] text-[#ffffff] text-xs font-semibold cursor-pointer btn-press shadow-sm"
                  title="Buka Pengaturan Pembaca (Mode Baca, Audiobook, PDF, dll)"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#ff6740]" />
                  <span>Menu</span>
                </button>
              </div>

              {/* Desktop Right Toolbar: Spacious & Comfortable */}
              <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* AI Voice Narration (Audiobook) Button */}
                <button
                  onClick={toggleAudioPlayer}
                  className={`flex items-center gap-1.5 min-h-[30px] px-2 sm:px-2.5 py-1 rounded-[6px] border text-xs font-mono transition-all cursor-pointer btn-press ${
                    showAudioPlayer
                      ? "bg-[#ff6740] border-[#ff6740] text-white shadow-sm shadow-[#ff6740]/30"
                      : "bg-[#202125] border-[#2e3036] text-[#9ca3af] hover:text-[#ffffff] hover:border-[#9ca3af]/40"
                  }`}
                  title={showAudioPlayer ? "Tutup Audiobook AI" : "Putar Audiobook AI (Narasi Suara)"}
                >
                  <Headphones className={`w-3.5 h-3.5 ${audioPlaying ? "animate-pulse text-white" : ""}`} />
                  <span className="hidden sm:inline font-semibold">Audiobook</span>
                </button>

                {/* Mode Baca: Webtoon vs Slide */}
                <div
                  className="flex items-center bg-[#202125] p-0.5 rounded-[6px] border border-[#2e3036]"
                  title="Pilih Mode Baca"
                >
                  <button
                    onClick={() => handleSetReaderMode("vertical")}
                    className={`flex items-center gap-1 min-h-[30px] px-2 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
                      readerMode === "vertical"
                        ? "bg-[#2e3036] text-[#ffffff] font-semibold"
                        : "text-[#9ca3af] hover:text-[#ffffff]"
                    }`}
                    title="Mode Webtoon (Gulir Vertikal)"
                  >
                    <Rows className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Webtoon</span>
                  </button>
                  <button
                    onClick={() => handleSetReaderMode("single")}
                    className={`flex items-center gap-1 min-h-[30px] px-2 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
                      readerMode === "single"
                        ? "bg-[#2e3036] text-[#ffffff] font-semibold"
                        : "text-[#9ca3af] hover:text-[#ffffff]"
                    }`}
                    title="Mode Slide (Halaman Tunggal)"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Slide</span>
                  </button>
                </div>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1 min-h-[30px] px-2 sm:px-2.5 py-1 rounded-[6px] border border-[#2e3036] bg-[#202125] hover:bg-[#2a2b30] text-xs font-mono text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer"
                  title={isFullscreen ? "Keluar Layar Penuh (F / Esc)" : "Layar Penuh (F)"}
                >
                  {isFullscreen ? (
                    <Minimize className="w-3.5 h-3.5" strokeWidth={1.5} />
                  ) : (
                    <Maximize className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  <span className="hidden lg:inline">{isFullscreen ? "Normal" : "Layar Penuh"}</span>
                </button>

                {/* Segmented Flat Toggle: Terjemahan vs Asli */}
                <div className="flex items-center bg-[#202125] p-0.5 rounded-[6px] border border-[#2e3036]">
                  <button
                    onClick={() => setShowTranslated(true)}
                    className={`min-h-[30px] px-2 sm:px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
                      showTranslated
                        ? "bg-[#ff6740] text-white font-semibold shadow-sm"
                        : "text-[#9ca3af] hover:text-[#ffffff]"
                    }`}
                  >
                    ID
                  </button>
                  <button
                    onClick={() => setShowTranslated(false)}
                    className={`min-h-[30px] px-2 sm:px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
                      !showTranslated
                        ? "bg-[#ff6740] text-white font-semibold shadow-sm"
                        : "text-[#9ca3af] hover:text-[#ffffff]"
                    }`}
                  >
                    Asli
                  </button>
                </div>

                {/* Download PDF Button */}
                <a
                  href={`${BACKEND_URL}/api/chapters/${chapterData.id}/pdf`}
                  download
                  className="flex items-center gap-1 min-h-[30px] px-2 sm:px-2.5 py-1 rounded-[6px] border border-[#2e3036] bg-[#202125] hover:bg-[#2a2b30] text-xs font-mono text-[#9ca3af] hover:text-[#ffffff] transition-colors"
                  title="Unduh PDF"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="hidden sm:inline">PDF</span>
                </a>

                {/* Delete Chapter Button */}
                <button
                  onClick={() =>
                    setDeleteTarget({
                      type: "chapter",
                      id: chapterData.id,
                      title: chapterData.title || `Bab ${chapterData.chapter_number || "1"}`,
                      redirectHome: true,
                    })
                  }
                  className="flex items-center gap-1 min-h-[30px] px-2 sm:px-2.5 py-1 rounded-[6px] border border-[#2e3036] bg-[#202125] hover:border-[#ef4444]/60 hover:bg-[#ef4444]/10 text-xs font-mono text-[#9ca3af] hover:text-[#ef4444] transition-colors cursor-pointer"
                  title="Hapus Bab Ini"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="hidden xl:inline">Hapus</span>
                </button>
              </div>
            </div>
          </header>

          {/* MOBILE READER QUICK SETTINGS / BOTTOM SHEET MODAL */}
          {showMobileReaderMenu && (
            <div
              className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm sm:hidden animate-fade-in select-none"
              onClick={() => setShowMobileReaderMenu(false)}
            >
              <div
                className="bg-[#202125] border-t border-[#2e3036] rounded-t-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-[#2e3036] pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#ff6740]" />
                    <h3 className="font-display font-bold text-sm text-[#ffffff]">
                      Menu & Pengaturan Pembaca
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowMobileReaderMenu(false)}
                    className="p-1 rounded-full text-[#9ca3af] hover:text-[#ffffff] hover:bg-[#2e3036] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Pilihan Mode Baca */}
                <div>
                  <label className="text-[11px] font-mono text-[#9ca3af] uppercase tracking-wider block mb-2 font-semibold">
                    Mode Membaca
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => {
                        handleSetReaderMode("vertical");
                        setShowMobileReaderMenu(false);
                      }}
                      className={`flex flex-col items-center justify-center p-3.5 rounded-[8px] border text-xs font-semibold gap-1.5 transition-all cursor-pointer ${
                        readerMode === "vertical"
                          ? "bg-[#ff6740]/15 border-[#ff6740] text-[#ff6740] shadow-md shadow-[#ff6740]/10"
                          : "bg-[#2a2b30] border-[#2e3036] text-[#ffffff] hover:border-[#9ca3af]/40"
                      }`}
                    >
                      <Rows className="w-5 h-5" />
                      <span>Mode Webtoon</span>
                      <span className="text-[10px] text-[#9ca3af] font-normal">Gulir Vertikal Panjang</span>
                    </button>

                    <button
                      onClick={() => {
                        handleSetReaderMode("single");
                        setShowMobileReaderMenu(false);
                      }}
                      className={`flex flex-col items-center justify-center p-3.5 rounded-[8px] border text-xs font-semibold gap-1.5 transition-all cursor-pointer ${
                        readerMode === "single"
                          ? "bg-[#ff6740]/15 border-[#ff6740] text-[#ff6740] shadow-md shadow-[#ff6740]/10"
                          : "bg-[#2a2b30] border-[#2e3036] text-[#ffffff] hover:border-[#9ca3af]/40"
                      }`}
                    >
                      <Columns className="w-5 h-5" />
                      <span>Mode Slide</span>
                      <span className="text-[10px] text-[#9ca3af] font-normal">Satu Per Satu (Ketuk)</span>
                    </button>
                  </div>
                </div>

                {/* Audiobook Narasi AI */}
                <div>
                  <label className="text-[11px] font-mono text-[#9ca3af] uppercase tracking-wider block mb-2 font-semibold">
                    Suara Narator AI
                  </label>
                  <button
                    onClick={() => {
                      toggleAudioPlayer();
                      setShowMobileReaderMenu(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-[8px] border text-xs font-medium transition-all cursor-pointer ${
                      showAudioPlayer
                        ? "bg-[#ff6740] border-[#ff6740] text-white shadow-md shadow-[#ff6740]/20"
                        : "bg-[#2a2b30] border-[#2e3036] text-[#ffffff] hover:border-[#9ca3af]/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-black/20 text-[#ffffff]">
                        <Headphones className="w-4 h-4 text-[#ff6740]" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-xs text-[#ffffff]">
                          {showAudioPlayer ? "Tutup Pemutar Audiobook" : "Buka Pemutar Audiobook AI"}
                        </div>
                        <div className="text-[10px] text-[#9ca3af]">
                          {readerMode === "single"
                            ? `Memutar narasi untuk Slide ${singlePageIdx + 1}`
                            : "Mendengarkan narasi suara drama anime"}
                        </div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#191a1c] text-[#ffffff] border border-[#2e3036]">
                      {showAudioPlayer ? "AKTIF" : "OFF"}
                    </div>
                  </button>
                </div>

                {/* Fitur & Alat Pendukung */}
                <div>
                  <label className="text-[11px] font-mono text-[#9ca3af] uppercase tracking-wider block mb-2 font-semibold">
                    Alat & Aksi
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => {
                        toggleFullscreen();
                        setShowMobileReaderMenu(false);
                      }}
                      className="flex items-center gap-2 p-3 rounded-[6px] bg-[#2a2b30] border border-[#2e3036] text-xs font-medium text-[#ffffff] hover:border-[#9ca3af]/40 cursor-pointer"
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4 text-[#9ca3af]" /> : <Maximize className="w-4 h-4 text-[#9ca3af]" />}
                      <span>{isFullscreen ? "Layar Normal" : "Layar Penuh"}</span>
                    </button>

                    <a
                      href={`${BACKEND_URL}/api/chapters/${chapterData.id}/pdf`}
                      download
                      onClick={() => setShowMobileReaderMenu(false)}
                      className="flex items-center gap-2 p-3 rounded-[6px] bg-[#2a2b30] border border-[#2e3036] text-xs font-medium text-[#ffffff] hover:border-[#9ca3af]/40 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-[#9ca3af]" />
                      <span>Unduh PDF</span>
                    </a>

                    <button
                      onClick={() => {
                        setShowMobileReaderMenu(false);
                        handleOpenRename({
                          type: "chapter",
                          id: chapterData.id,
                          currentTitle: chapterData.title || "",
                          currentChapterNumber: chapterData.chapter_number || "1",
                        });
                      }}
                      className="flex items-center gap-2 p-3 rounded-[6px] bg-[#2a2b30] border border-[#2e3036] text-xs font-medium text-[#ffffff] hover:border-[#9ca3af]/40 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 text-[#9ca3af]" />
                      <span>Ubah Nama Bab</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMobileReaderMenu(false);
                        setDeleteTarget({
                          type: "chapter",
                          id: chapterData.id,
                          title: chapterData.title || `Bab ${chapterData.chapter_number || "1"}`,
                          redirectHome: true,
                        });
                      }}
                      className="flex items-center gap-2 p-3 rounded-[6px] bg-[#2a2b30] border border-[#ef4444]/40 text-xs font-medium text-[#ef4444] hover:bg-[#ef4444]/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-[#ef4444]" />
                      <span>Hapus Bab</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* READER BODY: SINGLE PAGE MODE VS WEBTOON MODE */}
          {readerMode === "single" ? (
            <div className="flex-1 bg-[#191a1c] flex flex-col items-center justify-start select-none relative min-h-[calc(100vh-55px)] pb-24">
              {chapterData.pages.length > 0 ? (
                (() => {
                  const safeSingleIdx = Math.min(
                    Math.max(0, singlePageIdx),
                    Math.max(0, chapterData.pages.length - 1)
                  );
                  const curPage = chapterData.pages[safeSingleIdx] || chapterData.pages[0];
                  const isTrans = showTranslated && Boolean(curPage?.translated_url);
                  const curImgSrc = curPage
                    ? isTrans
                      ? `${BACKEND_URL}${curPage.translated_url}?v=2`
                      : `${BACKEND_URL}${curPage.original_url}?v=2`
                    : "";

                  return (
                    <div className="w-full max-w-4xl flex flex-col items-center px-2 sm:px-4 py-4 my-auto">
                      {/* Manga Page Display with Tap Zones */}
                      <div className="relative flex items-center justify-center max-w-full">
                        <img
                          key={`${curPage.page_number}-${isTrans ? "trans" : "orig"}`}
                          src={curImgSrc}
                          alt={`Halaman ${curPage.page_number} (${isTrans ? "Terjemahan" : "Asli"})`}
                          className="max-h-[82vh] w-auto max-w-full object-contain rounded-[4px] shadow-2xl block"
                        />

                        {/* Left Tap Zone (Previous Page) */}
                        <div
                          onClick={() => {
                            if (safeSingleIdx > 0) {
                              goToSlidePage(safeSingleIdx - 1);
                            }
                          }}
                          className={`absolute inset-y-0 left-0 w-1/3 flex items-center justify-start pl-2 sm:pl-4 transition-all ${
                            safeSingleIdx > 0 ? "cursor-pointer group" : "cursor-default"
                          }`}
                          title={safeSingleIdx > 0 ? "Halaman Sebelumnya (←)" : "Halaman Pertama"}
                        >
                          {safeSingleIdx > 0 && (
                            <div className="opacity-0 group-hover:opacity-100 bg-[#191a1c]/80 backdrop-blur border border-[#2e3036] text-[#ffffff] p-2.5 rounded-full transition-opacity shadow-xl">
                              <ChevronLeft className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        {/* Right Tap Zone (Next Page) */}
                        <div
                          onClick={() => {
                            if (safeSingleIdx < chapterData.pages.length - 1) {
                              goToSlidePage(safeSingleIdx + 1);
                            } else if (readerNav.nextChapter) {
                              fetchChapter(readerNav.nextChapter.id);
                            }
                          }}
                          className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-end pr-2 sm:pr-4 cursor-pointer group transition-all"
                          title={
                            safeSingleIdx < chapterData.pages.length - 1
                              ? "Halaman Berikutnya (→)"
                              : readerNav.nextChapter
                              ? `Lanjut ke Bab ${readerNav.nextChapter.chapter_number || "Berikutnya"}`
                              : "Halaman Terakhir"
                          }
                        >
                          <div className="opacity-0 group-hover:opacity-100 bg-[#191a1c]/80 backdrop-blur border border-[#2e3036] text-[#ffffff] p-2.5 rounded-full transition-opacity shadow-xl">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>

                      {/* If user is at the last page, show the End of Chapter Card below */}
                      {safeSingleIdx === chapterData.pages.length - 1 && (
                        <div className="w-full mt-6">
                          {/* End-of-Chapter Navigation Card */}
                          <div className="w-full max-w-2xl mx-auto my-6 p-6 sm:p-8 rounded-[8px] bg-[#202125] border border-[#2e3036] shadow-2xl text-center">
                            <div className="w-12 h-12 rounded-full bg-[#ff6740]/10 border border-[#ff6740]/30 text-[#ff6740] flex items-center justify-center mx-auto mb-3">
                              <Check className="w-6 h-6" strokeWidth={2.5} />
                            </div>

                            <h4 className="font-display font-bold text-lg sm:text-xl text-[#ffffff] mb-1">
                              Selesai Membaca!
                            </h4>
                            <p className="text-xs sm:text-sm text-[#9ca3af] mb-6">
                              Kamu telah menyelesaikan{" "}
                              <strong className="text-[#ffffff]">
                                {chapterData.title || "Manga"} — Bab {chapterData.chapter_number || "1"}
                              </strong>
                            </p>

                            {/* Primary Action: Next Chapter */}
                            {readerNav.nextChapter ? (
                              <div className="mb-5">
                                <button
                                  onClick={() =>
                                    readerNav.nextChapter && fetchChapter(readerNav.nextChapter.id)
                                  }
                                  className="w-full sm:w-auto min-w-[280px] inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[6px] bg-[#ff6740] hover:bg-[#ff7e59] text-white font-display font-bold text-sm sm:text-base shadow-lg shadow-[#ff6740]/25 transition-all cursor-pointer group"
                                >
                                  <span>
                                    Lanjut ke Bab {readerNav.nextChapter.chapter_number || "Berikutnya"}
                                  </span>
                                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1.5 transition-transform" />
                                </button>
                              </div>
                            ) : (
                              <div className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-[#2a2b30] border border-[#2e3036] text-xs font-mono text-[#9ca3af]">
                                <span className="text-sm">🎉</span>
                                <span>Ini adalah bab terbaru yang tersimpan di MangaID!</span>
                              </div>
                            )}

                            {/* Secondary Actions */}
                            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-5 border-t border-[#2e3036]/80">
                              {readerNav.prevChapter && (
                                <button
                                  onClick={() =>
                                    readerNav.prevChapter && fetchChapter(readerNav.prevChapter.id)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2e3036] bg-[#2a2b30] hover:bg-[#2e3036] text-xs font-mono text-[#ffffff] transition-colors cursor-pointer"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                  <span>Bab {readerNav.prevChapter.chapter_number || "Sebelumnya"}</span>
                                </button>
                              )}

                              {readerNav.currentSeries && (
                                <button
                                  onClick={() => {
                                    setSelectedSeries(readerNav.currentSeries);
                                    setView("home");
                                    if (typeof window !== "undefined") {
                                      window.history.pushState({}, "", window.location.pathname);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2e3036] bg-[#2a2b30] hover:bg-[#2e3036] text-xs font-mono text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer"
                                >
                                  <Layers className="w-3.5 h-3.5 text-[#ff6740]" />
                                  <span>Daftar Bab ({readerNav.currentSeries.totalChapters})</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  if (typeof window !== "undefined") {
                                    window.history.pushState({}, "", window.location.pathname);
                                  }
                                  loadSavedChapters();
                                  setView("home");
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2e3036] bg-[#2a2b30] hover:bg-[#2e3036] text-xs font-mono text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer"
                              >
                                <Home className="w-3.5 h-3.5" />
                                <span>Beranda</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="p-12 text-center text-xs text-[#9ca3af] font-mono">
                  Belum ada halaman pada bab ini.
                </div>
              )}

              {/* Floating Single Page Pagination Bar */}
              {!showAudioPlayer && chapterData.pages.length > 0 && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#202125]/95 backdrop-blur-md border border-[#2e3036] rounded-full px-4 py-1.5 shadow-2xl flex items-center gap-3 font-mono text-xs text-[#ffffff] select-none">
                  <button
                    disabled={singlePageIdx === 0}
                    onClick={() => goToSlidePage(singlePageIdx - 1)}
                    className="p-1 rounded-full hover:bg-[#2e3036] text-[#9ca3af] hover:text-[#ffffff] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Halaman Sebelumnya (←)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-semibold text-xs tracking-wide">
                    Hal {Math.min(singlePageIdx + 1, chapterData.pages.length)}{" "}
                    <span className="text-[#9ca3af] font-normal">/ {chapterData.pages.length}</span>
                  </span>

                  <button
                    disabled={singlePageIdx >= chapterData.pages.length - 1}
                    onClick={() => goToSlidePage(singlePageIdx + 1)}
                    className="p-1 rounded-full hover:bg-[#2e3036] text-[#9ca3af] hover:text-[#ffffff] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Halaman Berikutnya (→)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Quick Next Chapter CTA on floating pill when at last page */}
                  {singlePageIdx >= chapterData.pages.length - 1 && readerNav.nextChapter && (
                    <>
                      <div className="h-3.5 w-px bg-[#2e3036]" />
                      <button
                        onClick={() =>
                          readerNav.nextChapter && fetchChapter(readerNav.nextChapter.id)
                        }
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#ff6740] hover:text-[#ff7e59] transition-colors cursor-pointer"
                      >
                        <span>Bab {readerNav.nextChapter.chapter_number || "Next"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Webtoon Continuous Vertical Scroll Container */
            <div className="flex-1 bg-[#191a1c] flex flex-col items-center py-4 px-0">
              <div className="max-w-3xl w-full flex flex-col items-center">
                {chapterData.pages.map((p) => {
                  const isTrans = showTranslated && Boolean(p.translated_url);
                  const imgSrc = isTrans
                    ? `${BACKEND_URL}${p.translated_url}?v=2`
                    : `${BACKEND_URL}${p.original_url}?v=2`;

                  return (
                    <div
                      key={p.page_number}
                      id={`webtoon-page-${p.page_number}`}
                      className={`w-full relative bg-[#191a1c] flex justify-center transition-all ${
                        showAudioPlayer && currentAudioPage === p.page_number
                          ? "ring-1 ring-[#ff6740]/50 shadow-lg shadow-[#ff6740]/10"
                          : ""
                      }`}
                    >
                      <img
                        key={`${p.page_number}-${isTrans ? "trans" : "orig"}`}
                        src={imgSrc}
                        alt={`Halaman ${p.page_number} (${isTrans ? "Terjemahan" : "Asli"})`}
                        loading="lazy"
                        className="w-full h-auto block select-none"
                      />
                    </div>
                  );
                })}

                {/* End-of-Chapter Navigation Card in Webtoon Mode */}
                <div className="w-full max-w-2xl px-4 my-8 sm:my-12">
                  <div className="p-6 sm:p-8 rounded-[8px] bg-[#202125] border border-[#2e3036] shadow-2xl text-center">
                    <div className="w-12 h-12 rounded-full bg-[#ff6740]/10 border border-[#ff6740]/30 text-[#ff6740] flex items-center justify-center mx-auto mb-3">
                      <Check className="w-6 h-6" strokeWidth={2.5} />
                    </div>

                    <h4 className="font-display font-bold text-lg sm:text-xl text-[#ffffff] mb-1">
                      Selesai Membaca!
                    </h4>
                    <p className="text-xs sm:text-sm text-[#9ca3af] mb-6">
                      Kamu telah menyelesaikan{" "}
                      <strong className="text-[#ffffff]">
                        {chapterData.title || "Manga"} — Bab {chapterData.chapter_number || "1"}
                      </strong>
                    </p>

                    {/* Primary Action: Next Chapter */}
                    {readerNav.nextChapter ? (
                      <div className="mb-5">
                        <button
                          onClick={() =>
                            readerNav.nextChapter && fetchChapter(readerNav.nextChapter.id)
                          }
                          className="w-full sm:w-auto min-w-[280px] inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[6px] bg-[#ff6740] hover:bg-[#ff7e59] text-white font-display font-bold text-sm sm:text-base shadow-lg shadow-[#ff6740]/25 transition-all cursor-pointer group"
                        >
                          <span>
                            Lanjut ke Bab {readerNav.nextChapter.chapter_number || "Berikutnya"}
                          </span>
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1.5 transition-transform" />
                        </button>
                      </div>
                    ) : (
                      <div className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-[#2a2b30] border border-[#2e3036] text-xs font-mono text-[#9ca3af]">
                        <span className="text-sm">🎉</span>
                        <span>Ini adalah bab terbaru yang tersimpan di MangaID!</span>
                      </div>
                    )}

                    {/* Secondary Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-5 border-t border-[#2e3036]/80">
                      {readerNav.prevChapter && (
                        <button
                          onClick={() =>
                            readerNav.prevChapter && fetchChapter(readerNav.prevChapter.id)
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2e3036] bg-[#2a2b30] hover:bg-[#2e3036] text-xs font-mono text-[#ffffff] transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Bab {readerNav.prevChapter.chapter_number || "Sebelumnya"}</span>
                        </button>
                      )}

                      {readerNav.currentSeries && (
                        <button
                          onClick={() => {
                            setSelectedSeries(readerNav.currentSeries);
                            setView("home");
                            if (typeof window !== "undefined") {
                              window.history.pushState({}, "", window.location.pathname);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2e3036] bg-[#2a2b30] hover:bg-[#2e3036] text-xs font-mono text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#ff6740]" />
                          <span>Daftar Bab ({readerNav.currentSeries.totalChapters})</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            window.history.pushState({}, "", window.location.pathname);
                          }
                          loadSavedChapters();
                          setView("home");
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2e3036] bg-[#2a2b30] hover:bg-[#2e3036] text-xs font-mono text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer"
                      >
                        <Home className="w-3.5 h-3.5" />
                        <span>Beranda</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Floating Audiobook Player Control Bar */}
          {showAudioPlayer && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl bg-[#202125]/95 backdrop-blur-md border border-[#ff6740]/50 rounded-full px-4 sm:px-5 py-2.5 shadow-2xl flex items-center justify-between gap-2.5 animate-slide-up text-xs select-none">
              {/* Left: Play/Pause Button & Status */}
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={togglePlayPause}
                  disabled={audioLoading}
                  className="w-9 h-9 rounded-full bg-[#ff6740] hover:bg-[#ff7e59] text-white flex items-center justify-center transition-all cursor-pointer btn-press shadow-md shadow-[#ff6740]/30 shrink-0"
                  title={audioPlaying ? "Jeda" : "Putar"}
                >
                  {audioLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : audioPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-display font-bold text-[#ffffff] truncate">
                    <Headphones className="w-3.5 h-3.5 text-[#ff6740] shrink-0" />
                    <span>{readerMode === "single" ? `Slide ${currentAudioPage}` : `Hal ${currentAudioPage}`}</span>
                    <span className="text-[10px] font-mono text-[#9ca3af] font-normal">
                      / {chapterData.pages.length}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#9ca3af] font-mono truncate">
                    {audioLoading
                      ? "✨ AI Mengisi Suara Drama Komik..."
                      : audioError
                      ? audioError
                      : audioPlaying
                      ? audioVoice === "auto"
                        ? "🎭 Drama Komik AI (Gemini Voice Acting)"
                        : `Narasi AI Aktif (${audioVoice === "gadis" ? "Gadis" : "Ardi"})`
                      : "Dijeda"}
                  </div>
                </div>
              </div>

              {/* Right: Navigation, Voice, Speed, Close */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Prev / Next Page Buttons */}
                <button
                  onClick={handlePrevAudioPage}
                  disabled={currentAudioPage <= 1}
                  className="p-1.5 rounded-full hover:bg-[#2a2b30] text-[#9ca3af] hover:text-[#ffffff] disabled:opacity-30 cursor-pointer btn-press"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextAudioPage}
                  disabled={currentAudioPage >= chapterData.pages.length}
                  className="p-1.5 rounded-full hover:bg-[#2a2b30] text-[#9ca3af] hover:text-[#ffffff] disabled:opacity-30 cursor-pointer btn-press"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Voice Switcher (Auto Drama / Ardi / Gadis) */}
                <div className="flex items-center bg-[#16161a] border border-[#2e3036] rounded-[6px] p-0.5 text-[11px] font-mono">
                  <button
                    onClick={() => handleChangeVoice("auto")}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                      audioVoice === "auto"
                        ? "bg-[#ff6740] text-white font-semibold shadow-sm"
                        : "text-[#9ca3af] hover:text-[#ffffff]"
                    }`}
                    title="🎭 Mode Drama Auto-Cast: Suara pria, wanita, & narator otomatis bergantian dengan ekspresi emosi"
                  >
                    <span>🎭</span>
                    <span className="hidden sm:inline">Drama</span>
                    <span className="sm:hidden">Auto</span>
                  </button>
                  <button
                    onClick={() => handleChangeVoice("ardi")}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      audioVoice === "ardi"
                        ? "bg-[#2e3036] text-[#ffffff] font-semibold"
                        : "text-[#9ca3af] hover:text-[#ffffff]"
                    }`}
                    title="Suara Ardi (Pria / Shounen)"
                  >
                    Ardi
                  </button>
                  <button
                    onClick={() => handleChangeVoice("gadis")}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      audioVoice === "gadis"
                        ? "bg-[#2e3036] text-[#ffffff] font-semibold"
                        : "text-[#9ca3af] hover:text-[#ffffff]"
                    }`}
                    title="Suara Gadis (Wanita / Lembut)"
                  >
                    Gadis
                  </button>
                </div>

                {/* Speed Switcher */}
                <button
                  onClick={handleChangeSpeed}
                  className="px-2 py-1 rounded-[6px] border border-[#2e3036] bg-[#16161a] hover:bg-[#2a2b30] text-[10px] font-mono text-[#ffffff] cursor-pointer btn-press"
                  title="Kecepatan Bicara"
                >
                  {audioSpeed}x
                </button>

                {/* Close Audiobook */}
                <button
                  onClick={toggleAudioPlayer}
                  className="p-1.5 rounded-full hover:bg-[#2e3036] text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer ml-0.5"
                  title="Tutup Audiobook"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Mobile Bottom Navigation Bar (MangaDex style, visible on mobile when not in Reader) */}
      {view !== "reader" && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#141517]/95 backdrop-blur-md border-t border-[#2e3036] px-4 py-2 flex items-center justify-around select-none">
          <button
            onClick={() => {
              setView("home");
              setActiveNavTab("jelajah");
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] transition-colors cursor-pointer ${
              activeNavTab === "jelajah" && view === "home" ? "text-[#ff6740]" : "text-[#9ca3af] hover:text-[#ffffff]"
            }`}
          >
            <Compass className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold">Jelajah</span>
          </button>

          <button
            onClick={() => {
              setView("home");
              setActiveNavTab("penerjemah");
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] transition-colors cursor-pointer ${
              activeNavTab === "penerjemah" && view === "home" ? "text-[#ff6740]" : "text-[#9ca3af] hover:text-[#ffffff]"
            }`}
          >
            <Languages className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold">Penerjemah</span>
          </button>

          <button
            onClick={() => {
              setView("home");
              setActiveNavTab("koleksi");
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] transition-colors cursor-pointer relative ${
              activeNavTab === "koleksi" && view === "home" ? "text-[#ff6740]" : "text-[#9ca3af] hover:text-[#ffffff]"
            }`}
          >
            <div className="relative">
              <BookOpen className="w-5 h-5" strokeWidth={1.5} />
              {savedChapters.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1 text-[9px] font-mono bg-[#ff6740] text-white rounded-full leading-tight font-bold">
                  {savedChapters.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">Koleksi</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer"
          >
            <Sliders className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold">Pengaturan</span>
          </button>
        </nav>
      )}
      </div>

      {/* Help & Shortcuts Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#202125] border border-[#2e3036] rounded-[8px] max-w-lg w-full p-6 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-[#9ca3af] hover:text-[#ffffff] transition-colors p-1 rounded-[4px] cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-[6px] bg-[#ff6740]/10 border border-[#ff6740]/30 flex items-center justify-center text-[#ff6740]">
                <HelpCircle className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#ffffff]">
                  Bantuan & Pintasan MangaID
                </h3>
                <p className="text-xs text-[#9ca3af]">Panduan ringkas penggunaan aplikasi penerjemah manga</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-[#2a2b30] border border-[#2e3036] rounded-[6px] p-3.5 space-y-2">
                <div className="font-semibold text-[#ffffff]">Cara Menggunakan:</div>
                <ul className="list-disc pl-4 space-y-1 text-[#9ca3af]">
                  <li><strong className="text-[#ffffff]">Cari Manga (Explorer):</strong> Cari judul komik di tab <em>Cari Manga</em>, pilih bab, dan langsung terjemahkan tanpa perlu copas URL.</li>
                  <li><strong className="text-[#ffffff]">Tempel Link:</strong> Masukkan URL chapter manga dari MangaDex, Rawkuma, atau situs manga publik lainnya, lalu klik <span className="text-[#ff6740] font-semibold">Analisis</span>.</li>
                  <li><strong className="text-[#ffffff]">Upload Manual:</strong> Jika web target terproteksi Cloudflare/captcha, unduh halamannya lalu upload sebagai ZIP, CBZ, PDF, atau gambar.</li>
                  <li><strong className="text-[#ffffff]">Gaya Bahasa:</strong> Pilih antara <span className="text-[#ffffff]">Gaul / Santai</span> (lo-gue, komik) atau <span className="text-[#ffffff]">Baku / Netral</span>.</li>
                </ul>
              </div>

              <div className="bg-[#2a2b30] border border-[#2e3036] rounded-[6px] p-3.5 space-y-2">
                <div className="font-semibold text-[#ffffff]">Fitur & Pintasan Reader:</div>
                <div className="grid grid-cols-2 gap-2 text-[#9ca3af]">
                  <div>• Navigasi bab otomatis (Next / Prev)</div>
                  <div>• Mode Webtoon vs Slide tunggal</div>
                  <div>• Layar Penuh (F / Fullscreen)</div>
                  <div>• Keyboard panah (←/→ / Space)</div>
                  <div>• Unduh PDF bab komik</div>
                  <div>• Switch teks terjemahan vs asli</div>
                </div>
              </div>

              <div className="bg-[#2a2b30] border border-[#2e3036] rounded-[6px] p-3.5 space-y-1.5">
                <div className="font-semibold text-[#ffffff] flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#ff6740]" />
                  <span>Aplikasi MangaID (PWA / Download):</span>
                </div>
                <p className="text-xs text-[#9ca3af] leading-relaxed">
                  Web ini mendukung Progressive Web App (PWA). Anda dapat menginstall MangaID langsung ke layar utama HP (Android/iOS) atau Laptop/PC untuk membaca fullscreen tanpa browser bar dan performa lebih kencang.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2.5 rounded-[6px] bg-[#ff6740] hover:bg-[#ff7e59] font-semibold text-xs text-white transition-all cursor-pointer btn-press shadow-md shadow-[#ff6740]/20"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Chapter Drawer / Modal */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-[#202125] border border-[#2e3036] rounded-t-xl sm:rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-[#2e3036] flex items-center justify-between gap-3 bg-[#16161a]">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#ffffff] truncate">
                    {selectedSeries.title}
                  </h3>
                  <button
                    onClick={() =>
                      handleOpenRename({
                        type: "series",
                        oldTitle: selectedSeries.title,
                        currentTitle: selectedSeries.title,
                      })
                    }
                    className="p-1.5 rounded-[4px] hover:bg-[#2a2b30] text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer flex-shrink-0 btn-press"
                    title="Ganti Nama Seri Manga"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-[#9ca3af] mt-0.5 flex items-center gap-2">
                  <span>{selectedSeries.totalChapters} Bab Tersimpan</span>
                  <span>•</span>
                  <span>{selectedSeries.totalPages} Total Halaman</span>
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedSeries(null);
                  setDrawerSearchQuery("");
                }}
                className="w-8 h-8 rounded-[6px] border border-[#2e3036] flex items-center justify-center text-[#9ca3af] hover:text-[#ffffff] hover:bg-[#2a2b30] transition-colors cursor-pointer flex-shrink-0 btn-press"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Filter / Toolbar */}
            <div className="p-3 sm:px-5 sm:py-3 border-b border-[#2e3036] bg-[#202125] flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  type="text"
                  placeholder="Cari nomor bab (misal: 120)..."
                  value={drawerSearchQuery}
                  onChange={(e) => setDrawerSearchQuery(e.target.value)}
                  className="w-full bg-[#2a2b30] border border-[#2e3036] rounded-[6px] pl-8 pr-3 py-1.5 text-xs text-[#ffffff] placeholder-[#9ca3af] focus:outline-none focus:border-[#ff6740]"
                />
                {drawerSearchQuery && (
                  <button
                    onClick={() => setDrawerSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#ffffff]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setDrawerSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#2e3036] bg-[#2a2b30] hover:border-[#ff6740] text-xs font-mono text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer flex-shrink-0"
                title="Ubah urutan bab"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Urut:</span>
                <span>{drawerSortOrder === "asc" ? "1 → N" : "N → 1"}</span>
              </button>
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#2e3036]/60 p-2 sm:p-3 max-h-[55vh]">
              {drawerChapters.length > 0 ? (
                drawerChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between p-2.5 sm:px-3 hover:bg-[#2a2b30]/70 rounded-[6px] transition-colors gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-[4px] bg-[#ff6740]/10 border border-[#ff6740]/30 text-[#ff6740] text-xs font-mono font-semibold">
                          Bab {ch.chapter_number || "1"}
                        </span>
                        <span className="text-xs text-[#9ca3af] truncate">
                          {ch.title || selectedSeries.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[#9ca3af] font-mono">
                        <span>{ch.rendered_pages || 0}/{ch.total_pages || 0} Hal</span>
                        {ch.created_at && (
                          <span>• {new Date(ch.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          setSelectedSeries(null);
                          fetchChapter(ch.id);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-[5px] bg-[#ff6740] hover:bg-[#ff7e59] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Baca</span>
                      </button>

                      <a
                        href={`${BACKEND_URL}/api/chapters/${ch.id}/pdf`}
                        download
                        className="p-1.5 rounded-[5px] border border-[#2e3036] bg-[#202125] hover:bg-[#2a2b30] text-[#9ca3af] hover:text-[#ffffff] transition-colors"
                        title="Unduh PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() =>
                          handleOpenRename({
                            type: "chapter",
                            id: ch.id,
                            currentTitle: ch.title || selectedSeries.title,
                            currentChapterNumber: ch.chapter_number || "1",
                          })
                        }
                        className="p-1.5 rounded-[5px] border border-[#2e3036] bg-[#202125] hover:bg-[#2a2b30] text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer"
                        title="Ganti Nama / Nomor Bab"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          setDeleteTarget({
                            type: "chapter",
                            id: ch.id,
                            title: `${selectedSeries.title} — Bab ${ch.chapter_number || "1"}`,
                          })
                        }
                        className="p-1.5 rounded-[5px] border border-[#2e3036] bg-[#202125] hover:border-[#ef4444]/60 hover:bg-[#ef4444]/10 text-[#9ca3af] hover:text-[#ef4444] transition-colors cursor-pointer"
                        title="Hapus Bab Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#9ca3af]">
                  {drawerSearchQuery
                    ? `Tidak ada bab yang cocok dengan "${drawerSearchQuery}".`
                    : "Belum ada bab dalam seri ini."}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 sm:px-5 border-t border-[#2e3036] bg-[#16161a] flex items-center justify-between">
              <span className="text-xs text-[#9ca3af]">
                Menampilkan {drawerChapters.length} dari {selectedSeries.totalChapters} bab
              </span>
              <button
                onClick={() => {
                  setSelectedSeries(null);
                  setDrawerSearchQuery("");
                }}
                className="px-4 py-1.5 rounded-[6px] border border-[#2e3036] text-xs font-medium text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explorer Manga Chapters Drawer / Modal */}
      {explorerSelectedManga && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-[#202125] border border-[#2e3036] rounded-t-xl sm:rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in">
            {/* Header with MangaDex Backdrop Blur */}
            <div className="relative p-5 sm:p-6 border-b border-[#2e3036] overflow-hidden bg-[#16161a]">
              {/* Blurred Hero Background Cover */}
              {explorerSelectedManga.cover_url && (
                <div
                  className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-125 pointer-events-none"
                  style={{ backgroundImage: `url(${resolveProxyImage(explorerSelectedManga.cover_url)})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#16161a] via-[#16161a]/60 to-transparent pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex gap-4 sm:gap-5 min-w-0 flex-1">
                  {explorerSelectedManga.cover_url && (
                    <img
                      src={resolveProxyImage(explorerSelectedManga.cover_url)}
                      alt={explorerSelectedManga.title}
                      referrerPolicy="no-referrer"
                      className="w-20 sm:w-24 aspect-[7/10] object-cover rounded-md border border-[#2e3036] shadow-xl flex-shrink-0"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src.includes("/api/proxy/image?url=")) {
                          try {
                            const raw = decodeURIComponent(target.src.split("/api/proxy/image?url=")[1]);
                            if (raw && target.src !== raw) target.src = raw;
                          } catch {}
                        }
                      }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                        explorerSelectedManga.source === "nhentai"
                          ? "bg-[#ef4444]/20 border-[#ef4444]/40 text-[#ef4444]"
                          : explorerSelectedManga.source === "raw"
                          ? "bg-[#9B51E0]/20 border-[#9B51E0]/40 text-[#9B51E0]"
                          : explorerSelectedManga.source === "komikindo"
                          ? "bg-[#2ECC71]/20 border-[#2ECC71]/40 text-[#2ECC71]"
                          : "bg-[#ff6740]/10 border-[#ff6740]/30 text-[#ff6740]"
                      }`}>
                        {explorerSelectedManga.source === "nhentai"
                          ? "🔞 nhentai"
                          : explorerSelectedManga.source === "raw"
                          ? "🇯🇵 RAW Manga"
                          : explorerSelectedManga.source === "komikindo"
                          ? "🇮🇩 Komik Indo"
                          : "🌐 MangaDex"}
                      </span>
                      {explorerSelectedManga.status && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          explorerSelectedManga.status.toLowerCase().includes("complete")
                            ? "bg-blue-600/80 text-white"
                            : explorerSelectedManga.status.toLowerCase().includes("18+")
                            ? "bg-rose-600/80 text-white"
                            : "bg-emerald-600/80 text-white"
                        }`}>
                          {explorerSelectedManga.status}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-lg sm:text-2xl font-bold text-white leading-snug line-clamp-2">
                      {explorerSelectedManga.title}
                    </h3>
                    {explorerSelectedManga.description && (
                      <p className="text-xs text-[#9ca3af] line-clamp-2 mt-1 leading-relaxed">
                        {explorerSelectedManga.description}
                      </p>
                    )}
                    {explorerSelectedManga.tags.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] font-semibold text-[#9ca3af] mb-1.5 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-[#ff6740]" />
                          <span>Genre & Tag ({explorerSelectedManga.tags.length}) — klik untuk cari:</span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap max-h-20 sm:max-h-24 overflow-y-auto pr-1">
                          {explorerSelectedManga.tags.map((tag) => {
                            const isMatched = selectedGenres.some((sg) => sg.toLowerCase() === tag.toLowerCase());
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  const targetSource = (explorerSelectedManga.source as any) || "mangadex";
                                  setExplorerSource(targetSource);
                                  setExplorerSelectedManga(null);
                                  setExplorerQuery("");
                                  setSelectedGenres([tag]);
                                  handleSearchManga("", targetSource, [tag]);
                                }}
                                title={`Cari komik dengan genre/tag "${tag}"`}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] transition-all flex items-center gap-1 cursor-pointer group/tag btn-press ${
                                  isMatched
                                    ? "bg-[#ff6740] border border-[#ff6740] text-white font-bold shadow-sm"
                                    : "bg-[#2a2b30] border border-[#2e3036] hover:border-[#ff6740] hover:bg-[#ff6740]/15 text-[#9ca3af] hover:text-white"
                                }`}
                              >
                                <span>{tag}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setExplorerSelectedManga(null)}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors cursor-pointer flex-shrink-0"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter & Toolbar */}
            <div className="p-3 sm:p-4 border-b border-[#2e3036] bg-[#202125] flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
              {/* Language Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-mono text-[#9ca3af] flex-shrink-0">Bahasa:</span>
                {(!explorerSelectedManga.source || explorerSelectedManga.source === "mangadex") ? (
                  <div className="flex items-center bg-[#16161a] p-0.5 rounded-[6px] border border-[#2e3036] flex-shrink-0">
                    {[
                      { code: "all", label: "Semua" },
                      { code: "en", label: "Inggris (EN)" },
                      { code: "id", label: "Indonesia (ID)" },
                      { code: "ja", label: "Jepang (RAW)" },
                    ].map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setExplorerLang(l.code);
                          if (explorerSelectedManga) {
                            loadMangaChapters(explorerSelectedManga.id, l.code);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
                          explorerLang === l.code
                            ? "bg-[#ff6740] text-white font-semibold"
                            : "text-[#9ca3af] hover:text-[#ffffff]"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-2.5 py-1 rounded-[4px] bg-[#16161a] border border-[#2e3036] text-xs font-mono text-[#ffffff]">
                    {explorerSelectedManga.source === "komikindo" ? "🇮🇩 Bahasa Indonesia (Lengkap)" : "🇯🇵 RAW / Asli (Jepang)"}
                  </div>
                )}
              </div>

              {/* Search & Sort */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari bab..."
                    value={explorerChapterSearch}
                    onChange={(e) => setExplorerChapterSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[6px] bg-[#16161a] border border-[#2e3036] text-[#ffffff] placeholder-[#9ca3af]/60 focus:outline-none focus:border-[#ff6740]"
                  />
                </div>
                <button
                  onClick={() =>
                    setExplorerSortOrder(explorerSortOrder === "asc" ? "desc" : "asc")
                  }
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] border border-[#2e3036] bg-[#16161a] text-xs font-mono text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer"
                  title="Urutkan Bab"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{explorerSortOrder === "asc" ? "1 ➔ N" : "N ➔ 1"}</span>
                </button>
              </div>
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-[#2e3036]/50 space-y-1">
              {explorerChaptersLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#9ca3af]">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#ff6740]" />
                  <span className="text-xs font-mono">Memuat daftar bab...</span>
                </div>
              ) : filteredExplorerChapters.length > 0 ? (
                filteredExplorerChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3 border-b border-[#2e3036]/50 hover:bg-[#2a2b30]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white group-hover:text-[#ff6740] transition-colors">
                          Bab {ch.chapter_number}
                        </span>
                        {ch.title && (
                          <span className="text-xs text-[#9ca3af] truncate">
                            — {ch.title}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#2a2b30] text-[#9ca3af] uppercase">
                          {ch.language}
                        </span>
                        {ch.is_external && (
                          <span className="px-1.5 py-0.5 rounded bg-[#2a2b30] border border-[#2e3036] text-[9px] text-[#ff6740]">
                            Eksternal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#9ca3af] mt-1">
                        {ch.pages_count > 0 && <span>{ch.pages_count} Halaman</span>}
                        {ch.group_name && <span>• Kelompok: {ch.group_name}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ch.is_external ? (
                        <a
                          href={ch.external_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-md border border-[#2e3036] bg-[#16161a] hover:bg-[#2a2b30] text-[#9ca3af] hover:text-[#ffffff] text-xs transition-colors"
                        >
                          Buka Sumber Asli ↗
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {/* Opsi 1: Baca Langsung */}
                          <button
                            disabled={directReadingChapterId === ch.id || ingestingChapterId === ch.id}
                            onClick={() => handleDirectReadExplorerChapter(ch)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#2e3036] bg-[#2a2b30] hover:bg-[#34363e] text-white text-xs font-semibold transition-all cursor-pointer btn-press disabled:opacity-50"
                            title="Baca langsung tanpa proses translasi (bebas iklan & otomatis masuk Riwayat)"
                          >
                            {directReadingChapterId === ch.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Menyiapkan...</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 text-[#ff6740]" />
                                <span>Baca Langsung</span>
                              </>
                            )}
                          </button>

                          {/* Opsi 2: Terjemahkan AI */}
                          <button
                            disabled={ingestingChapterId === ch.id || directReadingChapterId === ch.id}
                            onClick={() => handleIngestExplorerChapter(ch)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#ff6740] hover:bg-[#ff7e59] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer btn-press disabled:opacity-50"
                            title="Terjemahkan bab ini ke bahasa Indonesia dengan AI"
                          >
                            {ingestingChapterId === ch.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Mengambil...</span>
                              </>
                            ) : (
                              <>
                                <Languages className="w-3.5 h-3.5" />
                                <span>Terjemahkan AI</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-[#9ca3af]">
                  Tidak ada bab ditemukan untuk filter ini. Coba pilih bahasa "Semua".
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:px-5 border-t border-[#2e3036] bg-[#16161a] flex items-center justify-between text-xs font-mono text-[#9ca3af]">
              <span>{filteredExplorerChapters.length} bab tersedia</span>
              <button
                onClick={() => setExplorerSelectedManga(null)}
                className="hover:text-[#ffffff] transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#202125] border border-[#2e3036] rounded-[8px] max-w-md w-full p-5 shadow-2xl relative animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-[6px] bg-[#ff6740]/10 border border-[#ff6740]/30 flex items-center justify-center text-[#ff6740] flex-shrink-0">
                <Pencil className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold text-[#ffffff]">
                  {renameTarget.type === "series" ? "Ganti Nama Seri Manga" : "Ganti Judul / Nomor Bab"}
                </h3>
                <p className="text-xs text-[#9ca3af]">
                  {renameTarget.type === "series"
                    ? "Perubahan nama seri akan otomatis diterapkan ke seluruh bab dalam grup ini."
                    : "Atur nomor dan grup manga agar tertata rapi di rak buku."}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 mb-5">
              {renameTarget.type === "chapter" && (
                <div>
                  <label className="block text-xs font-semibold text-[#ffffff] mb-1">
                    Nomor Bab (Contoh: 1, 12.5, 126)
                  </label>
                  <input
                    type="text"
                    value={newChapterNumInput}
                    onChange={(e) => setNewChapterNumInput(e.target.value)}
                    placeholder="Contoh: 1"
                    className="w-full bg-[#2a2b30] border border-[#2e3036] rounded-[6px] px-3 py-2 text-xs text-[#ffffff] placeholder-[#9ca3af] focus:outline-none focus:border-[#ff6740] transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#ffffff] mb-1">
                  {renameTarget.type === "series" ? "Nama Seri Baru" : "Nama Seri Manga (Grup)"}
                </label>
                <input
                  type="text"
                  value={newTitleInput}
                  onChange={(e) => setNewTitleInput(e.target.value)}
                  placeholder="Masukkan judul manga..."
                  className="w-full bg-[#2a2b30] border border-[#2e3036] rounded-[6px] px-3 py-2 text-xs text-[#ffffff] placeholder-[#9ca3af] focus:outline-none focus:border-[#ff6740] transition-colors"
                />
                {renameTarget.type === "chapter" && (
                  <p className="text-[11px] text-[#9ca3af] mt-1">
                    Jika diubah ke nama grup yang berbeda, bab ini akan berpindah ke rak seri tersebut.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRenameTarget(null)}
                disabled={isRenaming}
                className="px-3.5 py-2 rounded-[6px] border border-[#2e3036] text-xs font-medium text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer btn-press"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmRename}
                disabled={isRenaming || !newTitleInput.trim()}
                className="px-4 py-2 rounded-[6px] bg-[#ff6740] hover:bg-[#ff7e59] disabled:bg-[#2a2b30] disabled:text-[#9ca3af] font-semibold text-xs text-white transition-all cursor-pointer flex items-center gap-1.5 btn-press shadow-md shadow-[#ff6740]/20"
              >
                {isRenaming ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#202125] border border-[#2e3036] rounded-[8px] max-w-sm w-full p-5 shadow-2xl relative animate-scale-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-[6px] bg-[#ef4444]/10 border border-[#ef4444]/30 flex items-center justify-center text-[#ef4444] flex-shrink-0">
                <Trash2 className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold text-[#ffffff]">
                  {deleteTarget.type === "series" ? "Hapus Seluruh Seri?" : "Hapus Bab Ini?"}
                </h3>
                <p className="text-xs text-[#9ca3af] truncate">
                  {deleteTarget.title || "Target Terpilih"}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#9ca3af] mb-5 leading-relaxed">
              {deleteTarget.type === "series"
                ? `Semua ${deleteTarget.count ? `${deleteTarget.count} ` : ""}bab dalam manga ini beserta seluruh gambar terjemahan dan PDF akan dihapus permanen.`
                : "Bab ini beserta seluruh file gambar terjemahan dan berkas PDF akan dihapus permanen dari penyimpanan lokal."}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-[6px] border border-[#2e3036] text-xs font-medium text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer btn-press"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteAction}
                disabled={isDeleting}
                className="px-4 py-2 rounded-[6px] bg-[#ef4444] hover:bg-[#ff6740] font-semibold text-xs text-white transition-all cursor-pointer flex items-center gap-1.5 btn-press shadow-md shadow-[#ef4444]/20"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Update Notification Modal */}
      {showUpdateModal && versionInfo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#202125] border border-[#2e3036] rounded-[8px] max-w-lg w-full p-6 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => handleAcknowledgeUpdate(false)}
              className="absolute top-4 right-4 text-[#9ca3af] hover:text-[#ffffff] transition-colors p-1 rounded-[4px] cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-[8px] bg-[#ff6740]/10 border border-[#ff6740]/25 text-[#ff6740] flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#ff6740]/20 text-[#ff7e59] border border-[#ff6740]/30 font-bold">
                    v{versionInfo.version} (Terbaru)
                  </span>
                  <span className="text-[11px] font-mono text-[#9ca3af]">
                    {versionInfo.release_date}
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-[#ffffff] truncate">
                  {versionInfo.title}
                </h3>
              </div>
            </div>

            {/* Changelog Items */}
            <div className="my-4 p-4 rounded-[6px] bg-[#16161a] border border-[#2e3036] space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#9ca3af] font-semibold flex items-center gap-1.5">
                <span>Catatan Pembaruan & Fitur Baru:</span>
              </h4>
              <ul className="space-y-2.5 text-xs text-[#ffffff]">
                {versionInfo.changelog.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-[#ff6740]/20 text-[#ff7e59] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                    </div>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notification Opt-in Prompt */}
            {notificationPermission !== "granted" && (
              <div className="mb-4 p-3 rounded-[6px] bg-[#ff6740]/10 border border-[#ff6740]/25 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-[#ffffff]">
                  <Bell className="w-4 h-4 text-[#ff7e59] flex-shrink-0" />
                  <span className="text-[11px] leading-tight">Ingin dapat notifikasi status bar HP saat ada update & terjemahan selesai?</span>
                </div>
                <button
                  onClick={requestNotificationAccess}
                  className="px-2.5 py-1 rounded-[4px] bg-[#ff6740] hover:bg-[#ff7e59] text-white font-semibold text-[11px] flex-shrink-0 cursor-pointer shadow-sm btn-press"
                >
                  Aktifkan
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => handleAcknowledgeUpdate(true)}
                className="flex-1 py-2.5 rounded-[6px] bg-[#ff6740] hover:bg-[#ff7e59] font-semibold text-xs text-white transition-all cursor-pointer btn-press shadow-md shadow-[#ff6740]/20 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Perbarui & Muat Ulang</span>
              </button>
              <button
                onClick={() => handleAcknowledgeUpdate(false)}
                className="px-4 py-2.5 rounded-[6px] bg-[#2a2b30] hover:bg-[#2e3036] border border-[#2e3036] text-xs text-[#9ca3af] hover:text-[#ffffff] transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
