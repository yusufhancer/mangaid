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
}

export default function MangaIDApp() {
  // Navigation states: 'home' | 'review' | 'progress' | 'reader'
  const [view, setView] = useState<"home" | "review" | "progress" | "reader">("home");
  const [savedChapters, setSavedChapters] = useState<SavedChapter[]>([]);

  // Home states
  const [inputMode, setInputMode] = useState<"url" | "upload" | "explorer">("url");
  const [urlInput, setUrlInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Explorer states
  const [explorerQuery, setExplorerQuery] = useState("");
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerResults, setExplorerResults] = useState<ExplorerManga[]>([]);
  const [explorerHasSearched, setExplorerHasSearched] = useState(false);
  const [explorerSelectedManga, setExplorerSelectedManga] = useState<ExplorerManga | null>(null);
  const [explorerChapters, setExplorerChapters] = useState<ExplorerChapter[]>([]);
  const [explorerChaptersLoading, setExplorerChaptersLoading] = useState(false);
  const [explorerLang, setExplorerLang] = useState("en");
  const [explorerChapterSearch, setExplorerChapterSearch] = useState("");
  const [explorerSortOrder, setExplorerSortOrder] = useState<"asc" | "desc">("asc");
  const [ingestingChapterId, setIngestingChapterId] = useState<string | null>(null);

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

  // Explorer handlers
  const handleSearchManga = async (customQuery?: string) => {
    const q = (customQuery !== undefined ? customQuery : explorerQuery).trim();
    if (!q) return;

    setExplorerLoading(true);
    setErrorMsg(null);
    setExplorerHasSearched(true);

    try {
      const resp = await fetch(`${BACKEND_URL}/api/explorer/search?q=${encodeURIComponent(q)}`);
      if (!resp.ok) {
        throw new Error("Gagal mencari manga di katalog.");
      }
      const data: ExplorerManga[] = await resp.json();
      setExplorerResults(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat mencari manga.");
    } finally {
      setExplorerLoading(false);
    }
  };

  const loadMangaChapters = async (mangaId: string, lang: string) => {
    setExplorerChaptersLoading(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/explorer/manga/${mangaId}/chapters?lang=${lang}&limit=100`);
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

  const handleSelectManga = (manga: ExplorerManga) => {
    setExplorerSelectedManga(manga);
    setExplorerChapterSearch("");
    setExplorerSortOrder("asc");
    loadMangaChapters(manga.id, explorerLang);
  };

  const handleIngestExplorerChapter = async (chapter: ExplorerChapter) => {
    setIngestingChapterId(chapter.id);
    setErrorMsg(null);

    try {
      const resp = await fetch(`${BACKEND_URL}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://mangadex.org/chapter/${chapter.id}` }),
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
      setSinglePageIdx(0);
      setView("reader");
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", `?chapter=${cId}`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Fetch chapter error:", err);
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
          setSinglePageIdx((curr) => {
            if (curr < total - 1) return curr + 1;
            return curr;
          });
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
          e.preventDefault();
          setSinglePageIdx((curr) => (curr > 0 ? curr - 1 : 0));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, chapterData, readerMode]);

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
        const resp = await fetch(`${BACKEND_URL}/api/chapters/series/rename`, {
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
        const resp = await fetch(`${BACKEND_URL}/api/chapters/${renameTarget.id}`, {
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
        const resp = await fetch(`${BACKEND_URL}/api/chapters/series/delete`, {
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
                  <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setInputMode("url")}
                      className={`pb-2 text-xs font-semibold tracking-wide transition-colors relative cursor-pointer flex-shrink-0 ${
                        inputMode === "url"
                          ? "text-[#ECE9E2] border-b-2 border-[#E8452C] -mb-[18px]"
                          : "text-[#8E8B84] hover:text-[#ECE9E2]"
                      }`}
                    >
                      Tempel Link URL
                    </button>
                    <button
                      onClick={() => setInputMode("upload")}
                      className={`pb-2 text-xs font-semibold tracking-wide transition-colors relative cursor-pointer flex-shrink-0 ${
                        inputMode === "upload"
                          ? "text-[#ECE9E2] border-b-2 border-[#E8452C] -mb-[18px]"
                          : "text-[#8E8B84] hover:text-[#ECE9E2]"
                      }`}
                    >
                      Upload Manual
                    </button>
                    <button
                      onClick={() => setInputMode("explorer")}
                      className={`pb-2 text-xs font-semibold tracking-wide transition-colors relative cursor-pointer flex-shrink-0 flex items-center gap-1.5 ${
                        inputMode === "explorer"
                          ? "text-[#ECE9E2] border-b-2 border-[#E8452C] -mb-[18px]"
                          : "text-[#8E8B84] hover:text-[#ECE9E2]"
                      }`}
                    >
                      <Search className="w-3.5 h-3.5 text-[#E8452C]" />
                      <span>Cari Manga (Explorer)</span>
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
                    {inputMode === "explorer" ? (
                      <>
                        Cari judul manga.<br />
                        Pilih bab & terjemahkan otomatis.
                      </>
                    ) : inputMode === "upload" ? (
                      <>
                        Unggah berkas komik.<br />
                        Baca dalam bahasa Indonesia.
                      </>
                    ) : (
                      <>
                        Tempel link chapter.<br />
                        Baca dalam bahasa Indonesia.
                      </>
                    )}
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
                ) : inputMode === "upload" ? (
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
                ) : (
                  /* Form Explorer (Cari Manga Langsung) */
                  <div className="space-y-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSearchManga();
                      }}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <div className="relative flex-1">
                        <Search
                          className="w-4 h-4 text-[#8E8B84] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          strokeWidth={1.5}
                        />
                        <input
                          type="text"
                          required
                          placeholder="Ketik judul manga (contoh: One Piece, Jujutsu Kaisen, Chainsaw Man)..."
                          value={explorerQuery}
                          onChange={(e) => setExplorerQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-[6px] bg-[#0D0D0E] border border-[#2A2A2C] focus:border-[#E8452C] focus:outline-none text-[#ECE9E2] placeholder-[#8E8B84]/60 text-sm transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={explorerLoading || !explorerQuery.trim()}
                        className={`px-6 py-3 min-h-[44px] rounded-[6px] font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 flex-shrink-0 ${
                          explorerQuery.trim() && !explorerLoading
                            ? "bg-[#E8452C] hover:bg-[#FF5A40] text-white cursor-pointer"
                            : "bg-[#1C1C1E] border border-[#2A2A2C] text-[#8E8B84] cursor-not-allowed"
                        }`}
                      >
                        {explorerLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                            <span>Mencari...</span>
                          </>
                        ) : (
                          <>
                            <span>Cari Manga</span>
                            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </>
                        )}
                      </button>
                    </form>

                    {/* Quick suggestion tags */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="text-[#8E8B84] font-mono mr-1">Rekomendasi:</span>
                      {["One Piece", "Jujutsu Kaisen", "Solo Leveling", "Chainsaw Man", "Dandadan", "Oshi no Ko"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setExplorerQuery(tag);
                            handleSearchManga(tag);
                          }}
                          className="px-2.5 py-1 rounded-full bg-[#1C1C1E] border border-[#2A2A2C] hover:border-[#E8452C]/60 hover:text-[#ECE9E2] text-[#8E8B84] transition-colors text-xs cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    {/* Explorer Results Display */}
                    {explorerLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#8E8B84]">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#E8452C]" />
                        <span className="text-xs font-mono">Menghubungi katalog resmi MangaDex...</span>
                      </div>
                    ) : explorerResults.length > 0 ? (
                      <div className="pt-2">
                        <div className="text-xs text-[#8E8B84] font-mono mb-3">
                          Ditemukan {explorerResults.length} hasil untuk "{explorerQuery}":
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                          {explorerResults.map((manga) => (
                            <div
                              key={manga.id}
                              onClick={() => handleSelectManga(manga)}
                              className="group flex flex-col rounded-[6px] border border-[#2A2A2C] hover:border-[#E8452C] bg-[#111112] overflow-hidden transition-all duration-200 hover:-translate-y-1 shadow-sm hover:shadow-md cursor-pointer"
                            >
                              {/* Cover Poster */}
                              <div className="aspect-[3/4] relative bg-[#1C1C1E] overflow-hidden">
                                {manga.cover_url ? (
                                  <img
                                    src={manga.cover_url}
                                    alt={manga.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#8E8B84] text-xs font-mono p-2 text-center">
                                    No Cover
                                  </div>
                                )}
                                {manga.status && (
                                  <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-[3px] bg-[#0D0D0E]/80 backdrop-blur border border-[#2A2A2C] font-mono text-[9px] text-[#ECE9E2] uppercase tracking-wider">
                                    {manga.status}
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="p-2.5 flex-1 flex flex-col justify-between">
                                <div>
                                  <h4
                                    className="font-display text-xs font-bold text-[#ECE9E2] line-clamp-2 group-hover:text-[#E8452C] transition-colors leading-snug"
                                    title={manga.title}
                                  >
                                    {manga.title}
                                  </h4>
                                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8E8B84] mt-1">
                                    {manga.year && <span>{manga.year}</span>}
                                    {manga.tags[0] && (
                                      <span>• {manga.tags[0]}</span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="mt-2.5 w-full py-1.5 px-2 rounded-[4px] bg-[#1C1C1E] group-hover:bg-[#E8452C] text-[#ECE9E2] group-hover:text-white text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span>Pilih Bab</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : explorerHasSearched ? (
                      <div className="p-8 text-center rounded-[6px] border border-[#2A2A2C] bg-[#0D0D0E] text-[#8E8B84] text-xs">
                        Tidak ada komik yang ditemukan dengan kata kunci "{explorerQuery}". Silakan coba kata kunci lain.
                      </div>
                    ) : (
                      <div className="p-6 text-center rounded-[6px] border border-dashed border-[#2A2A2C] bg-[#0D0D0E] text-[#8E8B84] text-xs">
                        Ketik nama manga di atas atau klik salah satu rekomendasi untuk melihat katalog langsung dari MangaDex.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Koleksi Seri Manga Shelf */}
              <div id="bab-tersimpan-section" className="space-y-4 pt-2">
                {/* Header Row: Title on Left, Search + Filter on Right */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <h2 className="font-display text-lg font-bold text-[#ECE9E2]">
                      Koleksi Seri Manga
                    </h2>
                    <span className="font-mono text-xs text-[#8E8B84]">
                      ({filteredSeries.length} seri • {savedChapters.length} total bab)
                    </span>
                  </div>

                  {/* Search and Dropdown Filter */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#8E8B84] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                      <input
                        type="text"
                        placeholder="Cari judul seri manga..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs rounded-[6px] bg-[#151516] border border-[#2A2A2C] focus:border-[#E8452C] focus:outline-none text-[#ECE9E2] placeholder-[#8E8B84]/60 w-48 sm:w-60 transition-colors"
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

                {/* Grid of Series Master Cards */}
                {filteredSeries.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                    {filteredSeries.map((series) => (
                      <div
                        key={series.title}
                        className="group flex flex-col bg-[#151516] border border-[#2A2A2C] rounded-[6px] overflow-hidden hover:border-[#8E8B84]/60 transition-colors"
                      >
                        {/* 2:3 Cover Thumbnail */}
                        <div
                          onClick={() => setSelectedSeries(series)}
                          className="aspect-[2/3] bg-[#1C1C1E] relative overflow-hidden flex items-center justify-center cursor-pointer"
                        >
                          <img
                            src={`${BACKEND_URL}/api/chapters/${series.coverChapterId}/pages/1/original`}
                            alt={series.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-[3px] bg-[#0D0D0E]/85 border border-[#2A2A2C] font-mono text-[10px] text-[#ECE9E2] flex items-center gap-1 shadow-sm">
                            <Layers className="w-3 h-3 text-[#E8452C]" />
                            <span>{series.totalChapters} Bab</span>
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <h4
                                onClick={() => setSelectedSeries(series)}
                                className="font-display text-xs font-bold text-[#ECE9E2] truncate flex-1 cursor-pointer hover:text-[#E8452C] transition-colors"
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
                                className="text-[#8E8B84] hover:text-[#ECE9E2] p-0.5 transition-colors cursor-pointer"
                                title="Ubah Nama Seri"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="font-mono text-[11px] text-[#8E8B84] mt-0.5">
                              {series.totalRenderedPages}/{series.totalPages} hal selesai
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#2A2A2C]">
                            <button
                              onClick={() => setSelectedSeries(series)}
                              className="flex-1 min-h-[36px] py-1.5 px-2 rounded-[6px] bg-[#E8452C] hover:bg-[#FF5A40] text-white text-xs font-semibold text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5"
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
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[6px] border border-[#2A2A2C] hover:border-[#D4493E]/60 hover:bg-[#D4493E]/10 text-[#8E8B84] hover:text-[#D4493E] transition-colors cursor-pointer"
                              title="Hapus Seluruh Seri"
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
                    {searchQuery ? `Tidak ada seri manga yang cocok dengan kata kunci "${searchQuery}".` : "Belum ada manga yang tersimpan."}
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

      {/* VIEW 4: MANGA READER (WEBTOON CONTINUOUS SCROLL OR SINGLE PAGE SLIDE) */}
      {view === "reader" && chapterData && (
        <div className="flex-1 flex flex-col bg-[#0D0D0E]">
          {/* Reader Sticky Header */}
          <header className="sticky top-0 z-50 bg-[#0D0D0E]/95 backdrop-blur-md border-b border-[#2A2A2C] py-2 sm:py-2.5">
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
                  className="min-h-[32px] sm:min-h-[36px] text-xs text-[#8E8B84] hover:text-[#ECE9E2] flex items-center gap-1 font-mono transition-colors cursor-pointer flex-shrink-0"
                  title="Kembali ke Beranda"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                  <span className="hidden sm:inline">Kembali</span>
                </button>

                <div className="h-3.5 w-px bg-[#2A2A2C] flex-shrink-0" />

                {/* Chapter Quick Arrows & Title */}
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <button
                    disabled={!readerNav.prevChapter}
                    onClick={() => readerNav.prevChapter && fetchChapter(readerNav.prevChapter.id)}
                    className="p-1 sm:p-1.5 rounded-[4px] border border-[#2A2A2C] bg-[#151516] hover:bg-[#1C1C1E] text-[#8E8B84] hover:text-[#ECE9E2] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer flex-shrink-0"
                    title={
                      readerNav.prevChapter
                        ? `Bab Sebelumnya (Bab ${readerNav.prevChapter.chapter_number || "Sebelumnya"})`
                        : "Tidak ada bab sebelumnya"
                    }
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <h3 className="font-display font-bold text-[#ECE9E2] text-xs truncate max-w-[110px] sm:max-w-xs md:max-w-md">
                    {chapterData.title || "Manga"} — Bab {chapterData.chapter_number || "1"}
                  </h3>

                  <button
                    disabled={!readerNav.nextChapter}
                    onClick={() => readerNav.nextChapter && fetchChapter(readerNav.nextChapter.id)}
                    className="p-1 sm:p-1.5 rounded-[4px] border border-[#2A2A2C] bg-[#151516] hover:bg-[#1C1C1E] text-[#8E8B84] hover:text-[#ECE9E2] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer flex-shrink-0"
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
                    className="p-1 rounded text-[#8E8B84] hover:text-[#ECE9E2] hover:bg-[#1C1C1E] transition-colors cursor-pointer flex-shrink-0"
                    title="Ganti Nama / Nomor Bab"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Right: Mode Switcher, Fullscreen, Language, PDF, Delete */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Mode Baca: Webtoon vs Slide */}
                <div
                  className="flex items-center bg-[#151516] p-0.5 rounded-[6px] border border-[#2A2A2C]"
                  title="Pilih Mode Baca"
                >
                  <button
                    onClick={() => handleSetReaderMode("vertical")}
                    className={`flex items-center gap-1 min-h-[30px] px-2 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
                      readerMode === "vertical"
                        ? "bg-[#2A2A2C] text-[#ECE9E2] font-semibold"
                        : "text-[#8E8B84] hover:text-[#ECE9E2]"
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
                        ? "bg-[#2A2A2C] text-[#ECE9E2] font-semibold"
                        : "text-[#8E8B84] hover:text-[#ECE9E2]"
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
                  className="flex items-center gap-1 min-h-[30px] px-2 sm:px-2.5 py-1 rounded-[6px] border border-[#2A2A2C] bg-[#151516] hover:bg-[#1C1C1E] text-xs font-mono text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer"
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
                <div className="flex items-center bg-[#151516] p-0.5 rounded-[6px] border border-[#2A2A2C]">
                  <button
                    onClick={() => setShowTranslated(true)}
                    className={`min-h-[30px] px-2 sm:px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
                      showTranslated
                        ? "bg-[#E8452C] text-white font-semibold shadow-sm"
                        : "text-[#8E8B84] hover:text-[#ECE9E2]"
                    }`}
                  >
                    ID
                  </button>
                  <button
                    onClick={() => setShowTranslated(false)}
                    className={`min-h-[30px] px-2 sm:px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors cursor-pointer ${
                      !showTranslated
                        ? "bg-[#E8452C] text-white font-semibold shadow-sm"
                        : "text-[#8E8B84] hover:text-[#ECE9E2]"
                    }`}
                  >
                    Asli
                  </button>
                </div>

                {/* Download PDF Button */}
                <a
                  href={`${BACKEND_URL}/api/chapters/${chapterData.id}/pdf`}
                  download
                  className="flex items-center gap-1 min-h-[30px] px-2 sm:px-2.5 py-1 rounded-[6px] border border-[#2A2A2C] bg-[#151516] hover:bg-[#1C1C1E] text-xs font-mono text-[#8E8B84] hover:text-[#ECE9E2] transition-colors"
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
                  className="flex items-center gap-1 min-h-[30px] px-2 sm:px-2.5 py-1 rounded-[6px] border border-[#2A2A2C] bg-[#151516] hover:border-[#D4493E]/60 hover:bg-[#D4493E]/10 text-xs font-mono text-[#8E8B84] hover:text-[#D4493E] transition-colors cursor-pointer"
                  title="Hapus Bab Ini"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="hidden xl:inline">Hapus</span>
                </button>
              </div>
            </div>
          </header>

          {/* READER BODY: SINGLE PAGE MODE VS WEBTOON MODE */}
          {readerMode === "single" ? (
            <div className="flex-1 bg-[#0D0D0E] flex flex-col items-center justify-start select-none relative min-h-[calc(100vh-55px)] pb-24">
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
                              setSinglePageIdx(safeSingleIdx - 1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          className={`absolute inset-y-0 left-0 w-1/3 flex items-center justify-start pl-2 sm:pl-4 transition-all ${
                            safeSingleIdx > 0 ? "cursor-pointer group" : "cursor-default"
                          }`}
                          title={safeSingleIdx > 0 ? "Halaman Sebelumnya (←)" : "Halaman Pertama"}
                        >
                          {safeSingleIdx > 0 && (
                            <div className="opacity-0 group-hover:opacity-100 bg-[#0D0D0E]/80 backdrop-blur border border-[#2A2A2C] text-[#ECE9E2] p-2.5 rounded-full transition-opacity shadow-xl">
                              <ChevronLeft className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        {/* Right Tap Zone (Next Page) */}
                        <div
                          onClick={() => {
                            if (safeSingleIdx < chapterData.pages.length - 1) {
                              setSinglePageIdx(safeSingleIdx + 1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
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
                          <div className="opacity-0 group-hover:opacity-100 bg-[#0D0D0E]/80 backdrop-blur border border-[#2A2A2C] text-[#ECE9E2] p-2.5 rounded-full transition-opacity shadow-xl">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>

                      {/* If user is at the last page, show the End of Chapter Card below */}
                      {safeSingleIdx === chapterData.pages.length - 1 && (
                        <div className="w-full mt-6">
                          {/* End-of-Chapter Navigation Card */}
                          <div className="w-full max-w-2xl mx-auto my-6 p-6 sm:p-8 rounded-[8px] bg-[#151516] border border-[#2A2A2C] shadow-2xl text-center">
                            <div className="w-12 h-12 rounded-full bg-[#E8452C]/10 border border-[#E8452C]/30 text-[#E8452C] flex items-center justify-center mx-auto mb-3">
                              <Check className="w-6 h-6" strokeWidth={2.5} />
                            </div>

                            <h4 className="font-display font-bold text-lg sm:text-xl text-[#ECE9E2] mb-1">
                              Selesai Membaca!
                            </h4>
                            <p className="text-xs sm:text-sm text-[#8E8B84] mb-6">
                              Kamu telah menyelesaikan{" "}
                              <strong className="text-[#ECE9E2]">
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
                                  className="w-full sm:w-auto min-w-[280px] inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[6px] bg-[#E8452C] hover:bg-[#FF5A40] text-white font-display font-bold text-sm sm:text-base shadow-lg shadow-[#E8452C]/25 transition-all cursor-pointer group"
                                >
                                  <span>
                                    Lanjut ke Bab {readerNav.nextChapter.chapter_number || "Berikutnya"}
                                  </span>
                                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1.5 transition-transform" />
                                </button>
                              </div>
                            ) : (
                              <div className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-[#1C1C1E] border border-[#2A2A2C] text-xs font-mono text-[#8E8B84]">
                                <span className="text-sm">🎉</span>
                                <span>Ini adalah bab terbaru yang tersimpan di MangaID!</span>
                              </div>
                            )}

                            {/* Secondary Actions */}
                            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-5 border-t border-[#2A2A2C]/80">
                              {readerNav.prevChapter && (
                                <button
                                  onClick={() =>
                                    readerNav.prevChapter && fetchChapter(readerNav.prevChapter.id)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2A2A2C] bg-[#1C1C1E] hover:bg-[#2A2A2C] text-xs font-mono text-[#ECE9E2] transition-colors cursor-pointer"
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
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2A2A2C] bg-[#1C1C1E] hover:bg-[#2A2A2C] text-xs font-mono text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer"
                                >
                                  <Layers className="w-3.5 h-3.5 text-[#E8452C]" />
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
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2A2A2C] bg-[#1C1C1E] hover:bg-[#2A2A2C] text-xs font-mono text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer"
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
                <div className="p-12 text-center text-xs text-[#8E8B84] font-mono">
                  Belum ada halaman pada bab ini.
                </div>
              )}

              {/* Floating Single Page Pagination Bar */}
              {chapterData.pages.length > 0 && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#151516]/95 backdrop-blur-md border border-[#2A2A2C] rounded-full px-4 py-1.5 shadow-2xl flex items-center gap-3 font-mono text-xs text-[#ECE9E2] select-none">
                  <button
                    disabled={singlePageIdx === 0}
                    onClick={() => {
                      setSinglePageIdx((curr) => Math.max(0, curr - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="p-1 rounded-full hover:bg-[#2A2A2C] text-[#8E8B84] hover:text-[#ECE9E2] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Halaman Sebelumnya (←)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-semibold text-xs tracking-wide">
                    Hal {Math.min(singlePageIdx + 1, chapterData.pages.length)}{" "}
                    <span className="text-[#8E8B84] font-normal">/ {chapterData.pages.length}</span>
                  </span>

                  <button
                    disabled={singlePageIdx >= chapterData.pages.length - 1}
                    onClick={() => {
                      setSinglePageIdx((curr) => Math.min(chapterData.pages.length - 1, curr + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="p-1 rounded-full hover:bg-[#2A2A2C] text-[#8E8B84] hover:text-[#ECE9E2] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Halaman Berikutnya (→)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Quick Next Chapter CTA on floating pill when at last page */}
                  {singlePageIdx >= chapterData.pages.length - 1 && readerNav.nextChapter && (
                    <>
                      <div className="h-3.5 w-px bg-[#2A2A2C]" />
                      <button
                        onClick={() =>
                          readerNav.nextChapter && fetchChapter(readerNav.nextChapter.id)
                        }
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#E8452C] hover:text-[#FF5A40] transition-colors cursor-pointer"
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

                {/* End-of-Chapter Navigation Card in Webtoon Mode */}
                <div className="w-full max-w-2xl px-4 my-8 sm:my-12">
                  <div className="p-6 sm:p-8 rounded-[8px] bg-[#151516] border border-[#2A2A2C] shadow-2xl text-center">
                    <div className="w-12 h-12 rounded-full bg-[#E8452C]/10 border border-[#E8452C]/30 text-[#E8452C] flex items-center justify-center mx-auto mb-3">
                      <Check className="w-6 h-6" strokeWidth={2.5} />
                    </div>

                    <h4 className="font-display font-bold text-lg sm:text-xl text-[#ECE9E2] mb-1">
                      Selesai Membaca!
                    </h4>
                    <p className="text-xs sm:text-sm text-[#8E8B84] mb-6">
                      Kamu telah menyelesaikan{" "}
                      <strong className="text-[#ECE9E2]">
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
                          className="w-full sm:w-auto min-w-[280px] inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[6px] bg-[#E8452C] hover:bg-[#FF5A40] text-white font-display font-bold text-sm sm:text-base shadow-lg shadow-[#E8452C]/25 transition-all cursor-pointer group"
                        >
                          <span>
                            Lanjut ke Bab {readerNav.nextChapter.chapter_number || "Berikutnya"}
                          </span>
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1.5 transition-transform" />
                        </button>
                      </div>
                    ) : (
                      <div className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-[#1C1C1E] border border-[#2A2A2C] text-xs font-mono text-[#8E8B84]">
                        <span className="text-sm">🎉</span>
                        <span>Ini adalah bab terbaru yang tersimpan di MangaID!</span>
                      </div>
                    )}

                    {/* Secondary Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-5 border-t border-[#2A2A2C]/80">
                      {readerNav.prevChapter && (
                        <button
                          onClick={() =>
                            readerNav.prevChapter && fetchChapter(readerNav.prevChapter.id)
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2A2A2C] bg-[#1C1C1E] hover:bg-[#2A2A2C] text-xs font-mono text-[#ECE9E2] transition-colors cursor-pointer"
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2A2A2C] bg-[#1C1C1E] hover:bg-[#2A2A2C] text-xs font-mono text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#E8452C]" />
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
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#2A2A2C] bg-[#1C1C1E] hover:bg-[#2A2A2C] text-xs font-mono text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer"
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
                  <li><strong className="text-[#ECE9E2]">Cari Manga (Explorer):</strong> Cari judul komik di tab <em>Cari Manga</em>, pilih bab, dan langsung terjemahkan tanpa perlu copas URL.</li>
                  <li><strong className="text-[#ECE9E2]">Tempel Link:</strong> Masukkan URL chapter manga dari MangaDex, Rawkuma, atau situs manga publik lainnya, lalu klik <span className="text-[#E8452C] font-semibold">Analisis</span>.</li>
                  <li><strong className="text-[#ECE9E2]">Upload Manual:</strong> Jika web target terproteksi Cloudflare/captcha, unduh halamannya lalu upload sebagai ZIP, CBZ, PDF, atau gambar.</li>
                  <li><strong className="text-[#ECE9E2]">Gaya Bahasa:</strong> Pilih antara <span className="text-[#ECE9E2]">Gaul / Santai</span> (lo-gue, komik) atau <span className="text-[#ECE9E2]">Baku / Netral</span>.</li>
                </ul>
              </div>

              <div className="bg-[#1C1C1E] border border-[#2A2A2C] rounded-[6px] p-3.5 space-y-2">
                <div className="font-semibold text-[#ECE9E2]">Fitur & Pintasan Reader:</div>
                <div className="grid grid-cols-2 gap-2 text-[#8E8B84]">
                  <div>• Navigasi bab otomatis (Next / Prev)</div>
                  <div>• Mode Webtoon vs Slide tunggal</div>
                  <div>• Layar Penuh (F / Fullscreen)</div>
                  <div>• Keyboard panah (←/→ / Space)</div>
                  <div>• Unduh PDF bab komik</div>
                  <div>• Switch teks terjemahan vs asli</div>
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

      {/* Chapter Drawer / Modal */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#151516] border border-[#2A2A2C] rounded-t-xl sm:rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-[#2A2A2C] flex items-center justify-between gap-3 bg-[#111112]">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#ECE9E2] truncate">
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
                    className="p-1.5 rounded-[4px] hover:bg-[#1C1C1E] text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer flex-shrink-0"
                    title="Ganti Nama Seri Manga"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-[#8E8B84] mt-0.5 flex items-center gap-2">
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
                className="w-8 h-8 rounded-[6px] border border-[#2A2A2C] flex items-center justify-center text-[#8E8B84] hover:text-[#ECE9E2] hover:bg-[#1C1C1E] transition-colors cursor-pointer flex-shrink-0"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Filter / Toolbar */}
            <div className="p-3 sm:px-5 sm:py-3 border-b border-[#2A2A2C] bg-[#151516] flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8B84]" />
                <input
                  type="text"
                  placeholder="Cari nomor bab (misal: 120)..."
                  value={drawerSearchQuery}
                  onChange={(e) => setDrawerSearchQuery(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#2A2A2C] rounded-[6px] pl-8 pr-3 py-1.5 text-xs text-[#ECE9E2] placeholder-[#8E8B84] focus:outline-none focus:border-[#E8452C]"
                />
                {drawerSearchQuery && (
                  <button
                    onClick={() => setDrawerSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8B84] hover:text-[#ECE9E2]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setDrawerSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#2A2A2C] bg-[#1C1C1E] hover:border-[#E8452C] text-xs font-mono text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer flex-shrink-0"
                title="Ubah urutan bab"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Urut:</span>
                <span>{drawerSortOrder === "asc" ? "1 → N" : "N → 1"}</span>
              </button>
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#2A2A2C]/60 p-2 sm:p-3 max-h-[55vh]">
              {drawerChapters.length > 0 ? (
                drawerChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between p-2.5 sm:px-3 hover:bg-[#1C1C1E]/70 rounded-[6px] transition-colors gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-[4px] bg-[#E8452C]/10 border border-[#E8452C]/30 text-[#E8452C] text-xs font-mono font-semibold">
                          Bab {ch.chapter_number || "1"}
                        </span>
                        <span className="text-xs text-[#8E8B84] truncate">
                          {ch.title || selectedSeries.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[#8E8B84] font-mono">
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
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-[5px] bg-[#E8452C] hover:bg-[#FF5A40] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Baca</span>
                      </button>

                      <a
                        href={`${BACKEND_URL}/api/chapters/${ch.id}/pdf`}
                        download
                        className="p-1.5 rounded-[5px] border border-[#2A2A2C] bg-[#151516] hover:bg-[#1C1C1E] text-[#8E8B84] hover:text-[#ECE9E2] transition-colors"
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
                        className="p-1.5 rounded-[5px] border border-[#2A2A2C] bg-[#151516] hover:bg-[#1C1C1E] text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer"
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
                        className="p-1.5 rounded-[5px] border border-[#2A2A2C] bg-[#151516] hover:border-[#D4493E]/60 hover:bg-[#D4493E]/10 text-[#8E8B84] hover:text-[#D4493E] transition-colors cursor-pointer"
                        title="Hapus Bab Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#8E8B84]">
                  {drawerSearchQuery
                    ? `Tidak ada bab yang cocok dengan "${drawerSearchQuery}".`
                    : "Belum ada bab dalam seri ini."}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 sm:px-5 border-t border-[#2A2A2C] bg-[#111112] flex items-center justify-between">
              <span className="text-xs text-[#8E8B84]">
                Menampilkan {drawerChapters.length} dari {selectedSeries.totalChapters} bab
              </span>
              <button
                onClick={() => {
                  setSelectedSeries(null);
                  setDrawerSearchQuery("");
                }}
                className="px-4 py-1.5 rounded-[6px] border border-[#2A2A2C] text-xs font-medium text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explorer Manga Chapters Drawer / Modal */}
      {explorerSelectedManga && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#151516] border border-[#2A2A2C] rounded-t-xl sm:rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#2A2A2C] flex items-start justify-between gap-4 bg-[#111112]">
              <div className="flex gap-3 sm:gap-4 min-w-0 flex-1">
                {explorerSelectedManga.cover_url && (
                  <img
                    src={explorerSelectedManga.cover_url}
                    alt={explorerSelectedManga.title}
                    className="w-14 sm:w-16 h-20 sm:h-24 object-cover rounded-[4px] border border-[#2A2A2C] flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 rounded-[3px] bg-[#E8452C]/10 border border-[#E8452C]/30 text-[#E8452C] font-mono text-[10px] uppercase font-bold">
                      MangaDex
                    </span>
                    {explorerSelectedManga.status && (
                      <span className="font-mono text-[10px] text-[#8E8B84] uppercase">
                        {explorerSelectedManga.status}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#ECE9E2] leading-snug line-clamp-2">
                    {explorerSelectedManga.title}
                  </h3>
                  {explorerSelectedManga.description && (
                    <p className="text-xs text-[#8E8B84] line-clamp-2 mt-1">
                      {explorerSelectedManga.description}
                    </p>
                  )}
                  {explorerSelectedManga.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {explorerSelectedManga.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded-[3px] bg-[#1C1C1E] text-[10px] text-[#8E8B84]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setExplorerSelectedManga(null)}
                className="text-[#8E8B84] hover:text-[#ECE9E2] p-1.5 rounded-[6px] hover:bg-[#1C1C1E] transition-colors cursor-pointer flex-shrink-0"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Toolbar */}
            <div className="p-3 sm:p-4 border-b border-[#2A2A2C] bg-[#151516] flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#8E8B84]">Bahasa:</span>
                <div className="flex items-center bg-[#111112] p-0.5 rounded-[6px] border border-[#2A2A2C]">
                  {[
                    { code: "en", label: "Inggris (EN)" },
                    { code: "ja", label: "Jepang (RAW)" },
                    { code: "all", label: "Semua" },
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
                          ? "bg-[#E8452C] text-white font-semibold"
                          : "text-[#8E8B84] hover:text-[#ECE9E2]"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search & Sort */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 text-[#8E8B84] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari bab..."
                    value={explorerChapterSearch}
                    onChange={(e) => setExplorerChapterSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[6px] bg-[#111112] border border-[#2A2A2C] text-[#ECE9E2] placeholder-[#8E8B84]/60 focus:outline-none focus:border-[#E8452C]"
                  />
                </div>
                <button
                  onClick={() =>
                    setExplorerSortOrder(explorerSortOrder === "asc" ? "desc" : "asc")
                  }
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] border border-[#2A2A2C] bg-[#111112] text-xs font-mono text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer"
                  title="Urutkan Bab"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{explorerSortOrder === "asc" ? "1 ➔ N" : "N ➔ 1"}</span>
                </button>
              </div>
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-[#2A2A2C]/50 space-y-1">
              {explorerChaptersLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#8E8B84]">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#E8452C]" />
                  <span className="text-xs font-mono">Memuat daftar bab...</span>
                </div>
              ) : filteredExplorerChapters.length > 0 ? (
                filteredExplorerChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="pt-2 pb-2 flex items-center justify-between gap-3 hover:bg-[#1C1C1E]/50 px-2 rounded-[6px] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-[#ECE9E2]">
                          Bab {ch.chapter_number}
                        </span>
                        {ch.title && (
                          <span className="text-xs text-[#8E8B84] truncate">
                            — {ch.title}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-[#1C1C1E] text-[10px] font-mono text-[#8E8B84] uppercase">
                          {ch.language}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[#8E8B84] mt-0.5">
                        {ch.pages_count > 0 && <span>{ch.pages_count} Halaman</span>}
                        {ch.group_name && <span>• {ch.group_name}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ch.is_external ? (
                        <a
                          href={ch.external_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-[5px] border border-[#2A2A2C] bg-[#111112] hover:bg-[#1C1C1E] text-[#8E8B84] hover:text-[#ECE9E2] text-xs font-mono transition-colors"
                        >
                          Buka di MangaPlus ↗
                        </a>
                      ) : (
                        <button
                          disabled={ingestingChapterId === ch.id}
                          onClick={() => handleIngestExplorerChapter(ch)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[5px] bg-[#E8452C] hover:bg-[#FF5A40] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {ingestingChapterId === ch.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Mengambil...</span>
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Terjemahkan Bab Ini ➔</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-[#8E8B84]">
                  Tidak ada bab ditemukan untuk filter ini. Coba pilih bahasa "Semua".
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:px-5 border-t border-[#2A2A2C] bg-[#111112] flex items-center justify-between text-xs font-mono text-[#8E8B84]">
              <span>{filteredExplorerChapters.length} bab tersedia</span>
              <button
                onClick={() => setExplorerSelectedManga(null)}
                className="hover:text-[#ECE9E2] transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151516] border border-[#2A2A2C] rounded-[8px] max-w-md w-full p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-[6px] bg-[#E8452C]/10 border border-[#E8452C]/30 flex items-center justify-center text-[#E8452C] flex-shrink-0">
                <Pencil className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold text-[#ECE9E2]">
                  {renameTarget.type === "series" ? "Ganti Nama Seri Manga" : "Ganti Judul / Nomor Bab"}
                </h3>
                <p className="text-xs text-[#8E8B84]">
                  {renameTarget.type === "series"
                    ? "Perubahan nama seri akan otomatis diterapkan ke seluruh bab dalam grup ini."
                    : "Atur nomor dan grup manga agar tertata rapi di rak buku."}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 mb-5">
              {renameTarget.type === "chapter" && (
                <div>
                  <label className="block text-xs font-semibold text-[#ECE9E2] mb-1">
                    Nomor Bab (Contoh: 1, 12.5, 126)
                  </label>
                  <input
                    type="text"
                    value={newChapterNumInput}
                    onChange={(e) => setNewChapterNumInput(e.target.value)}
                    placeholder="Contoh: 1"
                    className="w-full bg-[#1C1C1E] border border-[#2A2A2C] rounded-[6px] px-3 py-2 text-xs text-[#ECE9E2] placeholder-[#8E8B84] focus:outline-none focus:border-[#E8452C]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#ECE9E2] mb-1">
                  {renameTarget.type === "series" ? "Nama Seri Baru" : "Nama Seri Manga (Grup)"}
                </label>
                <input
                  type="text"
                  value={newTitleInput}
                  onChange={(e) => setNewTitleInput(e.target.value)}
                  placeholder="Masukkan judul manga..."
                  className="w-full bg-[#1C1C1E] border border-[#2A2A2C] rounded-[6px] px-3 py-2 text-xs text-[#ECE9E2] placeholder-[#8E8B84] focus:outline-none focus:border-[#E8452C]"
                />
                {renameTarget.type === "chapter" && (
                  <p className="text-[11px] text-[#8E8B84] mt-1">
                    Jika diubah ke nama grup yang berbeda, bab ini akan berpindah ke rak seri tersebut.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRenameTarget(null)}
                disabled={isRenaming}
                className="px-3.5 py-2 rounded-[6px] border border-[#2A2A2C] text-xs font-medium text-[#8E8B84] hover:text-[#ECE9E2] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmRename}
                disabled={isRenaming || !newTitleInput.trim()}
                className="px-4 py-2 rounded-[6px] bg-[#E8452C] hover:bg-[#FF5A40] disabled:bg-[#1C1C1E] disabled:text-[#8E8B84] font-semibold text-xs text-white transition-colors cursor-pointer flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151516] border border-[#2A2A2C] rounded-[8px] max-w-sm w-full p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-[6px] bg-[#D4493E]/10 border border-[#D4493E]/30 flex items-center justify-center text-[#D4493E] flex-shrink-0">
                <Trash2 className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold text-[#ECE9E2]">
                  {deleteTarget.type === "series" ? "Hapus Seluruh Seri?" : "Hapus Bab Ini?"}
                </h3>
                <p className="text-xs text-[#8E8B84] truncate">
                  {deleteTarget.title || "Target Terpilih"}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#8E8B84] mb-5 leading-relaxed">
              {deleteTarget.type === "series"
                ? `Semua ${deleteTarget.count ? `${deleteTarget.count} ` : ""}bab dalam manga ini beserta seluruh gambar terjemahan dan PDF akan dihapus permanen.`
                : "Bab ini beserta seluruh file gambar terjemahan dan berkas PDF akan dihapus permanen dari penyimpanan lokal."}
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
                onClick={confirmDeleteAction}
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
