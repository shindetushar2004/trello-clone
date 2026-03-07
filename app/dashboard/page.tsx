"use client";

import Navbar from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlan } from "@/lib/contexts/PlanContext";
import { useBoards } from "@/lib/hooks/useBoards";
import { Board } from "@/lib/firebase/models";
import { useUser } from "@clerk/nextjs";
import {
  Download,
  Filter,
  FileDown,
  FileUp,
  Grid3x3,
  LayoutDashboard,
  List,
  Plus,
  Rocket,
  Search,
  Trash2,
  Trello,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

// Board color options
const BOARD_COLORS = [
  { label: "Blue", value: "bg-blue-500" },
  { label: "Green", value: "bg-green-500" },
  { label: "Purple", value: "bg-purple-500" },
  { label: "Red", value: "bg-red-500" },
  { label: "Orange", value: "bg-orange-500" },
  { label: "Pink", value: "bg-pink-500" },
];

// CSV ke liye boards ka format
const BOARDS_CSV_HEADERS = ["id", "title", "description", "color", "created_at", "updated_at"];

export default function DashboardPage() {
  const { user } = useUser();
  const { createBoard, deleteBoard, boards, sharedBoards, loading, error } = useBoards();
  const router = useRouter();
  const { isFreeUser } = usePlan();

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"boards" | "csv">("boards");

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState<boolean>(false);

  // Create Board Modal
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newBoardData, setNewBoardData] = useState({
    title: "",
    description: "",
    color: "bg-blue-500",
  });

  // CSV states
  const [csvImportStatus, setCsvImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [csvImportMessage, setCsvImportMessage] = useState<string>("");
  const [csvPreviewData, setCsvPreviewData] = useState<Record<string, string>[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState({
    search: "",
    dateRange: {
      start: null as string | null,
      end: null as string | null,
    },
    taskCount: {
      min: null as number | null,
      max: null as number | null,
    },
  });

  const canCreateBoard = true;

  const filteredBoards = boards.filter((board: Board) => {
    const matchesSearch = board.title
      .toLowerCase()
      .includes(filters.search.toLowerCase());
    const matchesDateRange =
      (!filters.dateRange.start ||
        new Date(board.created_at) >= new Date(filters.dateRange.start)) &&
      (!filters.dateRange.end ||
        new Date(board.created_at) <= new Date(filters.dateRange.end));
    return matchesSearch && matchesDateRange;
  });

  const filteredSharedBoards = sharedBoards.filter((board: Board) =>
    board.title.toLowerCase().includes(filters.search.toLowerCase())
  );

  function clearFilters() {
    setFilters({
      search: "",
      dateRange: { start: null, end: null },
      taskCount: { min: null, max: null },
    });
  }

  const handleCreateBoardClick = () => {
    if (!canCreateBoard) {
      setShowUpgradeDialog(true);
      return;
    }
    setNewBoardData({ title: "", description: "", color: "bg-blue-500" });
    setShowCreateDialog(true);
  };

  const handleCreateBoardSubmit = async () => {
    if (!newBoardData.title.trim()) return;
    try {
      setIsCreating(true);
      await createBoard({
        title: newBoardData.title.trim(),
        description: newBoardData.description.trim() || undefined,
        color: newBoardData.color,
      });
      setShowCreateDialog(false);
    } finally {
      setIsCreating(false);
    }
  };

  // ─── CSV Export ───────────────────────────────────────────────
  const handleExportCSV = () => {
    if (boards.length === 0) return;

    const rows = boards.map((board) =>
      BOARDS_CSV_HEADERS.map((header) => {
        const val = (board as unknown as Record<string, unknown>)[header];
        const str = val == null ? "" : String(val);
        // Quote values that contain commas or newlines
        return str.includes(",") || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")
    );

    const csvContent = [BOARDS_CSV_HEADERS.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `boards_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─── CSV Parse helper ─────────────────────────────────────────
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      // Handle quoted values
      const values: string[] = [];
      let inQuote = false;
      let current = "";
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuote = !inQuote;
        } else if (line[i] === "," && !inQuote) {
          values.push(current.trim());
          current = "";
        } else {
          current += line[i];
        }
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });
      return row;
    });
  };

  // ─── CSV Import ───────────────────────────────────────────────
  const handleCSVFile = async (file: File) => {
    if (!file || !file.name.endsWith(".csv")) {
      setCsvImportStatus("error");
      setCsvImportMessage("❌ Only .csv files are allowed.");
      return;
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      setCsvImportStatus("error");
      setCsvImportMessage("❌ The CSV file is empty or invalid.");
      return;
    }

    // Validate required columns
    const hasTitle = rows[0].hasOwnProperty("title");
    if (!hasTitle) {
      setCsvImportStatus("error");
      setCsvImportMessage('❌ The CSV must contain a "title" column.');
      return;
    }

    setCsvPreviewData(rows.slice(0, 5)); // preview first 5 rows
    setCsvImportStatus("success");
    setCsvImportMessage(`✅ ${rows.length} Boards are ready to be imported.`);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCSVFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleCSVFile(file);
  };

  const handleClearImportPreview = () => {
    setCsvPreviewData([]);
    setCsvImportStatus("idle");
    setCsvImportMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error loading boards</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Delete board handler
  const handleDeleteBoard = async (boardId: string) => {
    try {
      setIsDeleting(true);
      await deleteBoard(boardId);
      setDeleteConfirmId(null);
    } catch (e) {
      console.error("Failed to delete board:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Board Card Component
  const BoardCard = ({ board, isShared = false }: { board: Board; isShared?: boolean }) => (
    <div className="relative group/card">
      <Link href={`/boards/${board.id}`}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className={`w-4 h-4 ${board.color} rounded`} />
              <div className="flex items-center gap-1">
                {isShared && (
                  <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                    <Users className="h-3 w-3 mr-1" />
                    Shared
                  </Badge>
                )}
                <Badge className="text-xs" variant="secondary">
                  New
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors">
              {board.title}
            </CardTitle>
            <CardDescription className="text-sm mb-4">
              {board.description}
            </CardDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
              <span>Created {new Date(board.created_at).toLocaleDateString()}</span>
              <span>Updated {new Date(board.updated_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Delete button — top right on hover */}
      {!isShared && (
        <div className="absolute top-2 right-2 z-10">
          {deleteConfirmId === board.id ? (
            <div className="flex items-center gap-1 bg-white border border-red-200 rounded-lg shadow-md px-2 py-1">
              <span className="text-xs text-red-600 font-medium whitespace-nowrap">Delete board?</span>
              <button
                onClick={(e) => { e.preventDefault(); handleDeleteBoard(board.id); }}
                disabled={isDeleting}
                className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "..." : "Yes"}
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setDeleteConfirmId(null); }}
                className="text-[11px] font-semibold px-2 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); setDeleteConfirmId(board.id); }}
              className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50"
              title="Delete board"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="ml-52 px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome back,{" "}
            {user?.firstName ?? user?.emailAddresses[0].emailAddress}! 👋
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your boards today.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Boards</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{boards.length}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Trello className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Active Projects</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{boards.length}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Shared With Me</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{sharedBoards.length}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Recent Activity</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {boards.filter((board) => {
                      const updatedAt = new Date(board.updated_at);
                      const oneWeekAgo = new Date();
                      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                      return updatedAt > oneWeekAgo;
                    }).length}
                  </p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  📊
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── TAB SECTION ─────────────────────────────────────────── */}
        <div className="mb-6">
          {/* Tab Bar */}
          <div className="flex items-center border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab("boards")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "boards"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              My Boards
            </button>
            <button
              onClick={() => setActiveTab("csv")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "csv"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FileDown className="h-4 w-4" />
              Import / Export CSV
            </button>
          </div>

          {/* ── TAB: MY BOARDS ── */}
          {activeTab === "boards" && (
            <div>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-4 sm:space-y-0">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Boards</h2>
                  <p className="text-gray-600">Manage your projects and tasks</p>
                  {isFreeUser && (
                    <p className="text-sm text-gray-500 mt-1">
                      Free plan: {boards.length}/1 boards used
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2 rounded bg-white border p-1">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid3x3 />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                    >
                      <List />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(true)}>
                    <Filter />
                    Filter
                  </Button>
                  <Button onClick={handleCreateBoardClick}>
                    <Plus />
                    Create Board
                  </Button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4 sm:mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search boards..."
                  className="pl-10"
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                />
              </div>

              {/* My Boards Grid/List */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">My Boards</h3>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading boards...</div>
                ) : filteredBoards.length === 0 && boards.length === 0 ? (
                  <div className="text-center py-12">
                    <Trello className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No boards yet. Create your first one!</p>
                    <Button onClick={handleCreateBoardClick}>
                      <Plus className="mr-2" /> Create Board
                    </Button>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {filteredBoards.map((board, key) => (
                      <BoardCard key={key} board={board} />
                    ))}
                    <Card
                      className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer group"
                      onClick={handleCreateBoardClick}
                    >
                      <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
                        <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-2" />
                        <p className="text-sm sm:text-base text-gray-600 group-hover:text-blue-600 font-medium">
                          Create new board
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBoards.map((board, key) => (
                      <BoardCard key={key} board={board} />
                    ))}
                    <Card
                      className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer group"
                      onClick={handleCreateBoardClick}
                    >
                      <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[80px]">
                        <div className="flex items-center gap-2">
                          <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                          <p className="text-sm text-gray-600 group-hover:text-blue-600 font-medium">
                            Create new board
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Shared Boards */}
              {sharedBoards.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Shared With Me</h3>
                    <Badge variant="secondary">{sharedBoards.length}</Badge>
                  </div>
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {filteredSharedBoards.map((board, key) => (
                        <BoardCard key={key} board={board} isShared />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredSharedBoards.map((board, key) => (
                        <BoardCard key={key} board={board} isShared />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: CSV IMPORT / EXPORT ── */}
          {activeTab === "csv" && (
            <div className="max-w-3xl">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-gray-900">Import / Export CSV</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Export your boards to a CSV file or import new boards from a CSV file.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* ── EXPORT CARD ── */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Download className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Export Boards</CardTitle>
                        <CardDescription className="text-xs">
                          Download all boards into a CSV file.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600">
                        <p className="font-medium mb-1">The export will include:</p>
                        <ul className="text-xs space-y-1 text-gray-500 list-disc list-inside">
                          <li>Board title aur description</li>
                          <li>Board color</li>
                          <li>Created aur updated dates</li>
                          <li>Board ID</li>
                        </ul>
                      </div>
                      <p className="text-xs text-gray-400">
                        {boards.length} board{boards.length !== 1 ? "s" : ""} Available for export
                      </p>
                      <Button
                        className="w-full"
                        onClick={handleExportCSV}
                        disabled={boards.length === 0}
                        variant="outline"
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        {boards.length === 0 ? "No boards available" : "Export CSV"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* ── IMPORT CARD ── */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Upload className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Import Boards</CardTitle>
                        <CardDescription className="text-xs">
                          Import boards from a CSV file
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Drag & Drop Zone */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                          isDragOver
                            ? "border-blue-400 bg-blue-50"
                            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                        }`}
                      >
                        <FileUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">
                          Drop the CSV file here
                        </p>
                        <p className="text-xs text-gray-400 mt-1">or click to select</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleFileInputChange}
                        />
                      </div>

                      {/* Required Format Hint */}
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                        <p className="text-xs font-medium text-amber-700 mb-1">Required CSV Format:</p>
                        <code className="text-xs text-amber-600 block break-all">
                          title,description,color
                        </code>
                        <p className="text-xs text-amber-500 mt-1">
                          The "title" column is required
                        </p>
                      </div>

                      {/* Status Message */}
                      {csvImportStatus !== "idle" && (
                        <div
                          className={`rounded-md p-3 text-sm ${
                            csvImportStatus === "success"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {csvImportMessage}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Table */}
              {csvPreviewData.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-800">
                      Preview (first {csvPreviewData.length} rows)
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearImportPreview}
                      >
                        Close Preview
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {Object.keys(csvPreviewData[0]).map((col) => (
                            <th
                              key={col}
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {csvPreviewData.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-4 py-2 text-gray-700 max-w-[180px] truncate">
                                {val || <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create Board Modal */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] max-w-[450px] mx-auto">
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <p className="text-sm text-gray-600">
              Add a title and description for your new board.
            </p>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="board-title">
                Board Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="board-title"
                placeholder="e.g. Marketing Campaign"
                value={newBoardData.title}
                onChange={(e) =>
                  setNewBoardData((prev) => ({ ...prev, title: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && handleCreateBoardSubmit()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-description">Description (optional)</Label>
              <Input
                id="board-description"
                placeholder="What is this board about?"
                value={newBoardData.description}
                onChange={(e) =>
                  setNewBoardData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Board Color</Label>
              <div className="flex gap-2 flex-wrap">
                {BOARD_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() =>
                      setNewBoardData((prev) => ({ ...prev, color: color.value }))
                    }
                    className={`w-8 h-8 rounded-full ${color.value} transition-transform ${
                      newBoardData.color === color.value
                        ? "scale-125 ring-2 ring-offset-2 ring-gray-400"
                        : "hover:scale-110"
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-xs text-gray-500 mb-2">Preview</p>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${newBoardData.color}`} />
                <span className="font-medium text-sm">
                  {newBoardData.title || "Board Title"}
                </span>
              </div>
              {newBoardData.description && (
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  {newBoardData.description}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBoardSubmit}
                disabled={!newBoardData.title.trim() || isCreating}
              >
                {isCreating ? "Creating..." : "Create Board"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
          <DialogHeader>
            <DialogTitle>Filter Boards</DialogTitle>
            <p className="text-sm text-gray-600">Filter boards by title or date.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search board titles..."
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value || null },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value || null },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Button onClick={() => setIsFilterOpen(false)}>Apply Filters</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
          <DialogHeader>
            <DialogTitle>Upgrade to Create More Boards</DialogTitle>
            <p className="text-sm text-gray-600">
              Free users can only create one board. Upgrade to Pro or Enterprise to create
              unlimited boards.
            </p>
          </DialogHeader>
          <div className="flex justify-end space-x-4 pt-4">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => router.push("/pricing")}>View Plans</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}