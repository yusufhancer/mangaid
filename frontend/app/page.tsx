"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

const BACKEND_URL = "";

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

export default function MangaIDApp() {
  // Navigation states: 'home' | 'review' | 'progress' | 'reader'
  const [view, setView] = useState<"home" | "review" | "progress" | "reader">("home");
  const [savedChapters, setSavedChapters] = useState<SavedChapter[]>([]);

  // Home states
  const [inputMode, setInputMode] = useState<"url" | "upload">("url");
  const [urlInput, setUrlInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [tone, setTone] = useState("gaul");
  const [honorifics, setHonorifics] = useState("keep");

  // Search & Filter & Help states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showHelp, setShowHelp] = useState(false);

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

  // Delete chapter states
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; redirectHome?: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick test URL
  const SAMPLE_URL = "https://mangadex.org/chapter/e9cfaece-daa1-4830-b239-2d09c407b56b/6";

  // Handle URL Ingestion
  const handleIngestUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const resp = await fetch(`${BACKEND_URL}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Gagal memproses URL.");
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

      const resp = await fetch(`${BACKEND_URL}/api/ingest/upload`, {
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

  // Start Translation Job
  const handleStartTranslation = async () => {
    if (!ingestResult) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const resp = await fetch(`${BACKEND_URL}/api/jobs`, {
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
        const resp = await fetch(`${BACKEND_URL}/api/jobs/${jobId}`);
        if (!resp.ok) return;

        const data: JobStatus = await resp.json();
        setJobStatus(data);

        if (data.stage === "done") {
          clearInterval(interval);
          fetchChapter(data.chapter_id);
        } else if (data.stage === "failed") {
          clearInterval(interval);
          setErrorMsg(data.error_message || "Penerjemahan gagal.");
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [view, jobId]);

  // Load saved chapters from backend
  const loadSavedChapters = async () => {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/chapters`);
      if (resp.ok) {
        const data = await resp.json();
        setSavedChapters(data);
      }
    } catch (err) {
      console.error("Fetch saved chapters error:", err);
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
      }
    }
  }, []);

  // Fetch Chapter for Reader
  const fetchChapter = async (cId: string) => {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/chapters/${cId}`);
      if (!resp.ok) return;
      const data: ChapterData = await resp.json();
      setChapterData(data);
      setView("reader");
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", `?chapter=${cId}`);
      }
    } catch (err) {
      console.error("Fetch chapter error:", err);
    }
  };

  // Handle Chapter Deletion
  const confirmDeleteChapter = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/chapters/${deleteTarget.id}`, {
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
    } catch (err) {
      console.error("Delete chapter error:", err);
      alert("Terjadi kesalahan saat menghapus bab.");
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

  const filteredChapters = savedChapters.filter((ch) => {
    const titleMatch = (ch.title || "Untitled Manga").toLowerCase().includes(searchQuery.toLowerCase());
    const chapterMatch = (ch.chapter_number || "1").toLowerCase().includes(searchQuery.toLowerCase());
    if (searchQuery.trim() && !titleMatch && !chapterMatch) return false;
    if (filterStatus === "done") {
      return ch.rendered_pages === ch.total_pages && ch.total_pages > 0;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0D0D0E] text-[#ECE9E2]">
      {/* Desktop Left Sidebar (Fixed to viewport, stays in place when scrolling) */}
      {view !== "reader" && (
        <aside className="hidden lg:flex w-64 h-screen fixed top-0 left-0 bottom-0 border-r border-[#2A2A2C] bg-[#0D0D0E] flex-col justify-between p-4 flex-shrink-0 z-30 select-none overflow-y-auto">
          <div className="space-y-6">
            {/* Brand Logo */}
            <div
              onClick={() => {
                setView("home");
                if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-[4px] bg-[#E8452C] flex items-center justify-center font-bold text-white text-xs">
                ID
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-[#ECE9E2]">
                MangaID
              </span>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1">
              <button
                onClick={() => {
                  setView("home");
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
                  view === "home"
                    ? "bg-[#1C1C1E] text-[#ECE9E2] border border-[#2A2A2C]"
                    : "text-[#8E8B84] hover:text-[#ECE9E2] hover:bg-[#151516]"
                }`}
              >
                <Languages className="w-4 h-4 text-[#E8452C]" strokeWidth={1.5} />
                <span>Penerjemah</span>
              </button>

              <button
                onClick={() => {
                  setView("home");
                  const el = document.getElementById("bab-tersimpan-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-medium text-[#8E8B84] hover:text-[#ECE9E2] hover:bg-[#151516] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4" strokeWidth={1.5} />
                  <span>Koleksi Bab</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-[#1C1C1E] border border-[#2A2A2C] text-[#8E8B84]">
                  {savedChapters.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setView("home");
                  const el = document.getElementById("bab-tersimpan-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-xs font-medium text-[#8E8B84] hover:text-[#ECE9E2] hover:bg-[#151516] transition-colors cursor-pointer"
              >
                <History className="w-4 h-4" strokeWidth={1.5} />
                <span>Riwayat</span>
              </button>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-[#2A2A2C] space-y-2">
            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono text-[#8E8B84]">
              <FolderArchive className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Penyimpanan Lokal ({savedChapters.length} Bab)</span>
            </div>

            <button
              onClick={() => setShowHelp(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs text-[#8E8B84] hover:text-[#ECE9E2] hover:bg-[#151516] transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Bantuan & Pintasan</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Right Area */}
      <div className={`min-w-0 flex flex-col min-h-screen ${view !== "reader" ? "lg:pl-64" : ""}`}>
        {/* Mobile Top Header (Hidden on Desktop) */}
        {view !== "reader" && (
          <header className="lg:hidden sticky top-0 z-40 bg-[#0D0D0E] border-b border-[#2A2A2C] px-4 py-3 flex items-center justify-between">
            <div
              onClick={() => setView("home")}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="w-6 h-6 rounded-[4px] bg-[#E8452C] flex items-center justify-center font-bold text-white text-[11px]">
                ID
              </div>
              <span className="font-display text-lg font-bold text-[#ECE9E2]">MangaID</span>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 text-xs font-mono text-[#8E8B84] hover:text-[#ECE9E2] px-2.5 py-1.5 rounded-[6px] border border-[#2A2A2C] bg-[#151516] cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Gaya: <strong className="text-[#ECE9E2] capitalize">{tone}</strong></span>
            </button>
          </header>
        )}

        {/* Desktop Top Sub-Bar / Breadcrumb (Hidden on Mobile and Reader) */}
        {view !== "reader" && (
          <div className="hidden lg:flex items-center justify-between px-8 py-3 border-b border-[#2A2A2C]/60 text-xs font-mono text-[#8E8B84]">
            <div className="flex items-center gap-2">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-[#ECE9E2] font-semibold capitalize">
                {view === "home" ? "Translator" : view}
              </span>
            </div>
            <div className="text-[11px] text-[#8E8B84]">
              {savedChapters.length} chapter di database
            </div>
          </div>
        )}

        {/* Settings Modal Drawer */}
        {showSettings && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[#151516] border border-[#2A2A2C] rounded-[6px] max-w-md w-full p-6 shadow-xl relative">
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 text-[#8E8B84] hover:text-[#ECE9E2] transition-colors p-1 rounded-[4px] cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <h3 className="font-display text-base font-bold text-[#ECE9E2] mb-5">
                Pengaturan Terjemahan
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-mono text-[#8E8B84] uppercase tracking-wider block mb-2">
                    Gaya Nada Bahasa
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTone("gaul")}
                      className={`p-3 rounded-[6px] border text-left text-xs transition-colors ${
                        tone === "gaul"
                          ? "border-[#E8452C] bg-[#1C1C1E] text-[#ECE9E2]"
                          : "border-[#2A2A2C] bg-[#151516] text-[#8E8B84] hover:border-[#8E8B84]/40"
                      }`}
                    >
                      <div className="font-semibold text-sm mb-0.5 text-[#ECE9E2]">Gaul / Santai</div>
                      <div className="text-[#8E8B84]">Lo-gue, kata seru santai khas komik</div>
                    </button>
                    <button
                      onClick={() => setTone("neutral")}
                      className={`p-3 rounded-[6px] border text-left text-xs transition-colors ${
                        tone === "neutral"
                          ? "border-[#E8452C] bg-[#1C1C1E] text-[#ECE9E2]"
                          : "border-[#2A2A2C] bg-[#151516] text-[#8E8B84] hover:border-[#8E8B84]/40"
                      }`}
                    >
                      <div className="font-semibold text-sm mb-0.5 text-[#ECE9E2]">Baku / Netral</div>
                      <div className="text-[#8E8B84]">Bahasa Indonesia standar untuk narasi resmi</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-[#8E8B84] uppercase tracking-wider block mb-2">
                    Honorifik (-san, -kun, oppa)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setHonorifics("keep")}
                      className={`p-2.5 rounded-[6px] border text-xs font-medium transition-colors ${
                        honorifics === "keep"
                          ? "border-[#E8452C] bg-[#1C1C1E] text-[#ECE9E2]"
                          : "border-[#2A2A2C] bg-[#151516] text-[#8E8B84] hover:border-[#8E8B84]/40"
                      }`}
                    >
                      Pertahankan (-san, -kun)
                    </button>
                    <button
                      onClick={() => setHonorifics("drop")}
                      className={`p-2.5 rounded-[6px] border text-xs font-medium transition-colors ${
                        honorifics === "drop"
                          ? "border-[#E8452C] bg-[#1C1C1E] text-[#ECE9E2]"
                          : "border-[#2A2A2C] bg-[#151516] text-[#8E8B84] hover:border-[#8E8B84]/40"
                      }`}
                    >
                      Hapus / Lokalkan
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="mt-6 w-full py-2.5 min-h-[44px] rounded-[6px] bg-[#E8452C] hover:bg-[#FF5A40] font-semibold text-xs text-white transition-colors cursor-pointer"
              >
                Simpan & Tutup
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className={`flex-1 flex flex-col ${view === "reader" ? "" : "pb-20 lg:pb-8"}`}>
          {/* VIEW 1: HOME */}
          {view === "home" && (
            <main className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto flex flex-col">
              {/* Card Box Workspace (The one user loved!) */}
              <div className="bg-[#151516] border border-[#2A2A2C] rounded-[8px] p-5 sm:p-6 shadow-sm">
                {/* Top Toolbar inside Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2A2A2C] mb-6">
                  {/* Underlined Tab Switcher */}
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setInputMode("url")}
                      className={`pb-2 text-xs font-semibold tracking-wide transition-colors relative cursor-pointer ${
                        inputMode === "url"
                          ? "text-[#ECE9E2] border-b-2 border-[#E8452C] -mb-[18px]"
                          : "text-[#8E8B84] hover:text-[#ECE9E2]"
                      }`}
                    >
                      Tempel Link URL
                    </button>
                    <button
                      onClick={() => setInputMode("upload")}
                      className={`pb-2 text-xs font-semibold tracking-wide transition-colors relative cursor-pointer ${
                        inputMode === "upload"
                          ? "text-[#ECE9E2] border-b-2 border-[#E8452C] -mb-[18px]"
                          : "text-[#8E8B84] hover:text-[#ECE9E2]"
                      }`}
                    >
                      Upload Manual (ZIP/CBZ/PDF)
                    </button>
                  </div>

                  {/* Single Tone Selector on the entire screen */}
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-mono text-[#8E8B84] hover:text-[#ECE9E2] px-3 py-1.5 rounded-[6px] border border-[#2A2A2C] bg-[#1C1C1E] hover:border-[#8E8B84]/50 transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>
                      Gaya: <strong className="text-[#ECE9E2] font-semibold capitalize">{tone}</strong>
                    </span>
                  </button>
                </div>

                {/* Headline */}
                <div className="mb-5">
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#ECE9E2] leading-tight tracking-tight">
                    Tempel link chapter.<br />
                    Baca dalam bahasa Indonesia.
                  </h1>
                </div>

                {/* Error Message Alert */}
                {errorMsg && (
                  <div className="w-full mb-5 p-3.5 rounded-[6px] bg-[#1C1C1E] border border-[#D4493E] text-[#ECE9E2] text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-[#D4493E] flex-shrink-0" strokeWidth={1.5} />
                    <div className="flex-1">{errorMsg}</div>
                  </div>
                )}

                {/* Form Ingest URL */}
                {inputMode === "url" ? (
                  <div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleIngestUrl(e);
                      }}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <div className="relative flex-1">
                        <LinkIcon className="w-4 h-4 text-[#8E8B84] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                        <input
                          type="text"
                          required
                          placeholder="https://..."
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-[6px] bg-[#0D0D0E] border border-[#2A2A2C] focus:border-[#E8452C] focus:outline-none text-[#ECE9E2] placeholder-[#8E8B84]/60 text-sm transition-colors font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleIngestUrl()}
                        disabled={loading || !urlInput.trim()}
                        className={`px-6 py-3 min-h-[44px] rounded-[6px] font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 flex-shrink-0 ${
                          urlInput.trim() && !loading
                            ? "bg-[#E8452C] hover:bg-[#FF5A40] text-white cursor-pointer"
                            : "bg-[#1C1C1E] border border-[#2A2A2C] text-[#8E8B84] cursor-not-allowed"
                        }`}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                            <span>Memindai...</span>
                          </>
                        ) : (
                          <>
                            <span>Analisis</span>
                            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-[#8E8B84]">
                      <span>Situs apa pun yang bisa dibuka publik, atau unggah berkas.</span>
                      <button
                        type="button"
                        onClick={() => setUrlInput(SAMPLE_URL)}
                        className="text-[#8E8B84] hover:text-[#ECE9E2] underline underline-offset-2 transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1"
                      >
                        <LinkIcon className="w-3 h-3" strokeWidth={1.5} />
                        <span>Gunakan contoh link MangaDex</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Form Upload Manual */
                  <form onSubmit={handleManualUpload} className="space-y-4">
                    <div className="border border-dashed border-[#2A2A2C] hover:border-[#8E8B84] rounded-[6px] p-8 bg-[#0D0D0E] text-center transition-colors">
                      <FileArchive className="w-8 h-8 text-[#8E8B84] mx-auto mb-2" strokeWidth={1.5} />
                      <h4 className="text-sm font-semibold text-[#ECE9E2] mb-1">
                        Pilih file gambar, ZIP, CBZ, atau PDF
                      </h4>
                      <p className="text-xs text-[#8E8B84] mb-4">
                        Gunakan opsi ini jika link web memiliki Cloudflare atau proteksi unduhan
                      </p>
                      <input
                        type="file"
                        multiple
                        accept=".zip,.cbz,.pdf,image/png,image/jpeg,image/webp"
                        onChange={(e) => setSelectedFiles(e.target.files)}
                        className="block mx-auto text-xs text-[#8E8B84] file:mr-3 file:py-1.5 file:px-3 file:rounded-[4px] file:border-0 file:text-xs file:font-semibold file:bg-[#1C1C1E] file:text-[#ECE9E2] hover:file:bg-[#2A2A2C] cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Judul chapter (opsional)"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        className="flex-1 px-4 py-2.5 min-h-[44px] rounded-[6px] bg-[#0D0D0E] border border-[#2A2A2C] focus:border-[#E8452C] focus:outline-none text-[#ECE9E2] placeholder-[#8E8B84]/60 text-xs"
                      />
                      <button
                        type="submit"
                        disabled={loading || !selectedFiles || selectedFiles.length === 0}
                        className={`px-5 py-2.5 min-h-[44px] rounded-[6px] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 flex-shrink-0 ${
                          selectedFiles && selectedFiles.length > 0 && !loading
                            ? "bg-[#E8452C] hover:bg-[#FF5A40] text-white cursor-pointer"
                            : "bg-[#1C1C1E] border border-[#2A2A2C] text-[#8E8B84] cursor-not-allowed"
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

              {/* Bab Tersimpan Shelf */}
              <div id="bab-tersimpan-section" className="space-y-4 pt-2">
                {/* Header Row: Title on Left, Search + Filter on Right */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <h2 className="font-display text-lg font-bold text-[#ECE9E2]">
                      Bab Tersimpan
                    </h2>
                    <span className="font-mono text-xs text-[#8E8B84]">
                      ({filteredChapters.length} bab{searchQuery ? " ditemukan" : " tersedia"})
                    </span>
                  </div>

                  {/* Search and Dropdown Filter (Matching user screenshot) */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#8E8B84] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                      <input
                        type="text"
                        placeholder="Cari chapter..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs rounded-[6px] bg-[#151516] border border-[#2A2A2C] focus:border-[#E8452C] focus:outline-none text-[#ECE9E2] placeholder-[#8E8B84]/60 w-44 sm:w-56 transition-colors"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E8B84] hover:text-[#ECE9E2] p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="py-1.5 px-3 text-xs rounded-[6px] bg-[#151516] border border-[#2A2A2C] text-[#ECE9E2] focus:border-[#E8452C] focus:outline-none cursor-pointer"
                    >
                      <option value="all">Semua</option>
                      <option value="done">Selesai</option>
                    </select>
                  </div>
                </div>

                {/* Grid of Manga Covers */}
                {filteredChapters.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                    {filteredChapters.map((ch) => (
                      <div
                        key={ch.id}
                        className="group flex flex-col bg-[#151516] border border-[#2A2A2C] rounded-[6px] overflow-hidden hover:border-[#8E8B84]/60 transition-colors"
                      >
                        {/* 2:3 Cover Thumbnail */}
                        <div className="aspect-[2/3] bg-[#1C1C1E] relative overflow-hidden flex items-center justify-center">
                          <img
                            src={`${BACKEND_URL}/api/chapters/${ch.id}/pages/1/original`}
                            alt={ch.title || "Cover"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[3px] bg-[#0D0D0E]/85 border border-[#2A2A2C] font-mono text-[10px] text-[#ECE9E2]">
                            {ch.rendered_pages}/{ch.total_pages} hal
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-display text-xs font-bold text-[#ECE9E2] truncate">
                              {ch.title || "Untitled Manga"}
                            </h4>
                            <div className="font-mono text-[11px] text-[#8E8B84] mt-0.5">
                              Bab {ch.chapter_number || "1"} • {ch.language_source.toLowerCase() === "id" ? "Bahasa Indonesia" : `${ch.language_source.toUpperCase()} → ID`}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#2A2A2C]">
                            <button
                              onClick={() => fetchChapter(ch.id)}
                              className="flex-1 min-h-[36px] py-1.5 px-2 rounded-[6px] bg-[#E8452C] hover:bg-[#FF5A40] text-white text-xs font-semibold text-center transition-colors cursor-pointer"
                            >
                              Baca
                            </button>
                            <a
                              href={`${BACKEND_URL}/api/chapters/${ch.id}/pdf`}
                              download
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[6px] border border-[#2A2A2C] hover:bg-[#1C1C1E] text-[#8E8B84] hover:text-[#ECE9E2] transition-colors"
                              title="Unduh PDF"
                            >
                              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ id: ch.id, title: ch.title || `Bab ${ch.chapter_number || "1"}` });
                              }}
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[6px] border border-[#2A2A2C] hover:border-[#D4493E]/60 hover:bg-[#D4493E]/10 text-[#8E8B84] hover:text-[#D4493E] transition-colors cursor-pointer"
                              title="Hapus Bab"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-[6px] border border-[#2A2A2C] bg-[#151516] text-[#8E8B84] text-xs">
                    {searchQuery ? `Tidak ada bab yang cocok dengan kata kunci "${searchQuery}".` : "Belum ada bab yang tersimpan."}
                  </div>
                )}
              </div>
            </main>
          )}

      {/* VIEW 2: REVIEW DETECTED PAGES */}
      {view === "review" && ingestResult && (
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-6 pb-4 border-b border-[#2A2A2C]">
            <div>
              <h2 className="font-display text-xl font-bold text-[#ECE9E2]">
                {ingestResult.title || "Chapter Manga"} — Bab {ingestResult.chapter_number || "1"}
              </h2>
              <div className="font-mono text-xs text-[#8E8B84] mt-1">
                {reviewPages.length} halaman terdeteksi • Ekstraksi: {ingestResult.layer_used}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("home")}
                className="px-3.5 py-2 min-h-[40px] rounded-[6px] border border-[#2A2A2C] text-xs font-medium text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer flex items-center justify-center"
              >
                Batal
              </button>
              <button
                onClick={handleStartTranslation}
                disabled={loading || reviewPages.length === 0}
                className={`px-4 py-2 min-h-[40px] rounded-[6px] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  reviewPages.length > 0 && !loading
                    ? "bg-[#E8452C] hover:bg-[#FF5A40] text-white cursor-pointer"
                    : "bg-[#1C1C1E] border border-[#2A2A2C] text-[#8E8B84] cursor-not-allowed"
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
                className="group relative bg-[#151516] border border-[#2A2A2C] hover:border-[#E8452C] rounded-[6px] overflow-hidden transition-colors flex flex-col"
              >
                <div className="aspect-[3/4] bg-[#1C1C1E] overflow-hidden relative">
                  <img
                    src={imgUrl}
                    alt={`Halaman ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[3px] bg-[#0D0D0E]/85 font-mono text-[10px] text-[#ECE9E2]">
                    #{idx + 1}
                  </span>
                </div>

                <div className="p-1.5 bg-[#151516] border-t border-[#2A2A2C] flex items-center justify-between text-xs">
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => movePage(idx, "left")}
                      disabled={idx === 0}
                      className="p-1 text-[#8E8B84] hover:text-[#ECE9E2] disabled:opacity-20 cursor-pointer"
                      title="Geser Kiri"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => movePage(idx, "right")}
                      disabled={idx === reviewPages.length - 1}
                      className="p-1 text-[#8E8B84] hover:text-[#ECE9E2] disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>

                  <button
                    onClick={() => removePage(idx)}
                    className="p-1 text-[#8E8B84] hover:text-[#D4493E] cursor-pointer"
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
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-16 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-[#151516] border border-[#2A2A2C] rounded-[6px] p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-display text-base font-bold text-[#ECE9E2]">
                Memproses Terjemahan
              </h3>
              <span className="font-mono text-xs text-[#8E8B84] uppercase">
                {jobStatus?.stage || "MENYIAPKAN"}
              </span>
            </div>

            {/* Flat Thin Vermilion Progress Bar */}
            <div className="w-full bg-[#1C1C1E] h-1.5 rounded-[3px] overflow-hidden my-4">
              <div
                className="bg-[#E8452C] h-full transition-all duration-300"
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

            <div className="flex items-center justify-between font-mono text-xs text-[#8E8B84]">
              <span>
                {jobStatus?.stage === "rendering"
                  ? `Render: ${jobStatus.completed_pages} / ${jobStatus.total_pages}`
                  : `Halaman: ${jobStatus?.current_page || 1} / ${jobStatus?.total_pages || "?"}`}
              </span>
              <span>
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
              <div className="mt-4 p-3 rounded-[6px] bg-[#1C1C1E] border border-[#D4493E] text-[#ECE9E2] text-xs">
                {errorMsg}
              </div>
            )}
          </div>
        </main>
      )}

      {/* VIEW 4: WEBTOON CONTINUOUS SCROLL READER */}
      {view === "reader" && chapterData && (
        <div className="flex-1 flex flex-col bg-[#0D0D0E]">
          {/* Reader Sticky Header */}
          <header className="sticky top-0 z-50 bg-[#0D0D0E]/95 border-b border-[#2A2A2C] py-2.5">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.history.pushState({}, "", window.location.pathname);
                    }
                    loadSavedChapters();
                    setView("home");
                  }}
                  className="min-h-[36px] text-xs text-[#8E8B84] hover:text-[#ECE9E2] flex items-center gap-1 font-mono transition-colors cursor-pointer flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                  <span>Kembali</span>
                </button>
                <div className="h-3.5 w-px bg-[#2A2A2C] flex-shrink-0" />
                <h3 className="font-display font-bold text-[#ECE9E2] text-xs truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                  {chapterData.title || "Manga"} — Bab {chapterData.chapter_number || "1"}
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Segmented Flat Toggle */}
                <div className="flex items-center bg-[#151516] p-0.5 rounded-[6px] border border-[#2A2A2C]">
                  <button
                    onClick={() => setShowTranslated(true)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
                      showTranslated
                        ? "bg-[#E8452C] text-white font-semibold shadow-sm"
                        : "text-[#8E8B84] hover:text-[#ECE9E2]"
                    }`}
                  >
                    Terjemahan (ID)
                  </button>
                  <button
                    onClick={() => setShowTranslated(false)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
                      !showTranslated
                        ? "bg-[#E8452C] text-white font-semibold shadow-sm"
                        : "text-[#8E8B84] hover:text-[#ECE9E2]"
                    }`}
                  >
                    Teks Asli
                  </button>
                </div>

                {/* Download PDF Button */}
                <a
                  href={`${BACKEND_URL}/api/chapters/${chapterData.id}/pdf`}
                  download
                  className="flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-[6px] border border-[#2A2A2C] bg-[#151516] hover:bg-[#1C1C1E] text-xs font-mono text-[#8E8B84] hover:text-[#ECE9E2] transition-colors"
                  title="Unduh PDF"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>PDF</span>
                </a>

                {/* Delete Chapter Button */}
                <button
                  onClick={() =>
                    setDeleteTarget({
                      id: chapterData.id,
                      title: chapterData.title || `Bab ${chapterData.chapter_number || "1"}`,
                      redirectHome: true,
                    })
                  }
                  className="flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-[6px] border border-[#2A2A2C] bg-[#151516] hover:border-[#D4493E]/60 hover:bg-[#D4493E]/10 text-xs font-mono text-[#8E8B84] hover:text-[#D4493E] transition-colors cursor-pointer"
                  title="Hapus Bab Ini"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="hidden sm:inline">Hapus</span>
                </button>
              </div>
            </div>
          </header>

          {/* Webtoon Continuous Vertical Scroll Container */}
          <div className="flex-1 bg-[#0D0D0E] flex flex-col items-center py-4 px-0">
            <div className="max-w-3xl w-full flex flex-col items-center">
              {chapterData.pages.map((p) => {
                const isTrans = showTranslated && Boolean(p.translated_url);
                const imgSrc = isTrans
                  ? `${BACKEND_URL}${p.translated_url}?v=2`
                  : `${BACKEND_URL}${p.original_url}?v=2`;

                return (
                  <div key={p.page_number} className="w-full relative bg-[#0D0D0E] flex justify-center">
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
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on Desktop & in Reader mode) */}
      {view !== "reader" && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D0E]/95 backdrop-blur border-t border-[#2A2A2C] px-6 py-2 flex items-center justify-around select-none">
          <button
            onClick={() => {
              setView("home");
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] transition-colors cursor-pointer ${
              view === "home" ? "text-[#E8452C]" : "text-[#8E8B84] hover:text-[#ECE9E2]"
            }`}
          >
            <Languages className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Penerjemah</span>
          </button>

          <button
            onClick={() => {
              setView("home");
              const el = document.getElementById("bab-tersimpan-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer relative"
          >
            <div className="relative">
              <BookOpen className="w-5 h-5" strokeWidth={1.5} />
              {savedChapters.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1 text-[9px] font-mono bg-[#E8452C] text-white rounded-full leading-tight">
                  {savedChapters.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Koleksi</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer"
          >
            <Sliders className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Pengaturan</span>
          </button>
        </nav>
      )}
      </div>

      {/* Help & Shortcuts Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151516] border border-[#2A2A2C] rounded-[8px] max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-[#8E8B84] hover:text-[#ECE9E2] transition-colors p-1 rounded-[4px] cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-[6px] bg-[#E8452C]/10 border border-[#E8452C]/30 flex items-center justify-center text-[#E8452C]">
                <HelpCircle className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#ECE9E2]">
                  Bantuan & Pintasan MangaID
                </h3>
                <p className="text-xs text-[#8E8B84]">Panduan ringkas penggunaan aplikasi penerjemah manga</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-[#1C1C1E] border border-[#2A2A2C] rounded-[6px] p-3.5 space-y-2">
                <div className="font-semibold text-[#ECE9E2]">Cara Menggunakan:</div>
                <ul className="list-disc pl-4 space-y-1 text-[#8E8B84]">
                  <li><strong className="text-[#ECE9E2]">Tempel Link:</strong> Masukkan URL chapter manga dari MangaDex, Rawkuma, atau situs manga publik lainnya, lalu klik <span className="text-[#E8452C] font-semibold">Analisis</span>.</li>
                  <li><strong className="text-[#ECE9E2]">Upload Manual:</strong> Jika web target terproteksi Cloudflare/captcha, unduh halamannya lalu upload sebagai ZIP, CBZ, PDF, atau gambar.</li>
                  <li><strong className="text-[#ECE9E2]">Gaya Bahasa:</strong> Pilih antara <span className="text-[#ECE9E2]">Gaul / Santai</span> (lo-gue, komik) atau <span className="text-[#ECE9E2]">Baku / Netral</span>.</li>
                </ul>
              </div>

              <div className="bg-[#1C1C1E] border border-[#2A2A2C] rounded-[6px] p-3.5 space-y-2">
                <div className="font-semibold text-[#ECE9E2]">Fitur Tambahan:</div>
                <div className="grid grid-cols-2 gap-2 text-[#8E8B84]">
                  <div>• Pencarian & filter bab instan</div>
                  <div>• Webtoon continuous vertical reader</div>
                  <div>• Export PDF beresolusi tinggi</div>
                  <div>• Toggle teks asli vs terjemahan</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2.5 rounded-[6px] bg-[#E8452C] hover:bg-[#FF5A40] font-semibold text-xs text-white transition-colors cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151516] border border-[#2A2A2C] rounded-[8px] max-w-sm w-full p-5 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-[6px] bg-[#D4493E]/10 border border-[#D4493E]/30 flex items-center justify-center text-[#D4493E] flex-shrink-0">
                <Trash2 className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold text-[#ECE9E2]">
                  Hapus Bab Ini?
                </h3>
                <p className="text-xs text-[#8E8B84] truncate">
                  {deleteTarget.title || "Bab Terpilih"}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#8E8B84] mb-5 leading-relaxed">
              Bab ini beserta seluruh file gambar terjemahan dan berkas PDF akan dihapus permanen dari penyimpanan lokal.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-[6px] border border-[#2A2A2C] text-xs font-medium text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteChapter}
                disabled={isDeleting}
                className="px-4 py-2 rounded-[6px] bg-[#D4493E] hover:bg-[#E8452C] font-semibold text-xs text-white transition-colors cursor-pointer flex items-center gap-1.5"
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
    </div>
  );
}
