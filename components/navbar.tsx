"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Download,
  FileDown,
  FileText,
  FileUp,
  Filter,
  LayoutDashboard,
  MoreHorizontal,
  Trash2,
  Trello,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "./ui/badge";
import { useRef, useState } from "react";
import { useBoards } from "@/lib/hooks/useBoards";
import { Board } from "@/lib/firebase/models";

interface Props {
  boardTitle?: string;
  onEditBoard?: () => void;
  onFilterClick?: () => void;
  filterCount?: number;
  members?: { name: string }[];
  onInviteClick?: () => void;
}

const BOARDS_CSV_HEADERS = ["id", "title", "description", "color", "created_at", "updated_at"];

// ── Uploaded file type ───────────────────────────────────────────
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  content: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Sidebar ─────────────────────────────────────────────────────
function DashboardSidebar({ members, onInviteClick }: { members?: { name: string }[]; onInviteClick?: () => void }) {
  const { boards } = useBoards();
  const pathname = usePathname();
  const isBoardPage = pathname.startsWith("/boards/");
  const [activeTab, setActiveTab] = useState<"boards" | "csv" | "members">(
    isBoardPage ? "members" : "boards"
  );

  const [isDragOver, setIsDragOver] = useState(false);
  const [csvStatus, setCsvStatus] = useState<"idle" | "success" | "error">("idle");
  const [csvMessage, setCsvMessage] = useState("");
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const uploadFileRef = useRef<HTMLInputElement>(null);

  // Export CSV
  const handleExport = () => {
    if (!boards.length) return;
    const rows = boards.map((b) =>
      BOARDS_CSV_HEADERS.map((h) => {
        const val = String(Object.prototype.hasOwnProperty.call(b, h) ? (b as unknown as Record<string, unknown>)[h] ?? "" : "");
        return val.includes(",") ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(",")
    );
    const csv = [BOARDS_CSV_HEADERS.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `boards_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse CSV helper
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const values: string[] = [];
      let inQuote = false, cur = "";
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === "," && !inQuote) { values.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      values.push(cur.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      return row;
    });
  };

  // Handle import file selection
  const handleImportFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setCsvStatus("error");
      setCsvMessage("Only .csv files are supported for import.");
      return;
    }
    const rows = parseCSV(await file.text());
    if (!rows.length || !Object.prototype.hasOwnProperty.call(rows[0], "title")) {
      setCsvStatus("error");
      setCsvMessage('CSV must contain a "title" column.');
      return;
    }
    setCsvPreview(rows.slice(0, 5));
    setCsvStatus("success");
    setCsvMessage(`Showing ${rows.length} board(s) from the file.`);
  };

  // Clear import preview
  const handleClearImport = () => {
    setCsvPreview([]);
    setCsvStatus("idle");
    setCsvMessage("");
    if (importFileRef.current) importFileRef.current.value = "";
  };

  // Upload file to file manager
  const handleUploadFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Only .csv files can be uploaded.");
      return;
    }
    const content = await file.text();
    setUploadedFiles((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        uploadedAt: new Date(),
        content,
      },
      ...prev,
    ]);
    if (uploadFileRef.current) uploadFileRef.current.value = "";
  };

  // Delete file
  const handleDeleteFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    setDeleteConfirmId(null);
  };

  // Download blank CSV template with sample rows
  const handleDownloadTemplate = () => {
    const template = [
      "title,description,color",
      "Team Work,Collaboration board for the team,bg-blue-500",
      "Marketing,Campaign planning and tracking,bg-green-500",
      "Design Project,UI/UX design tasks,bg-purple-500",
      "Bug Fixes,Track and resolve issues,bg-red-500",
      "Personal Tasks,My personal to-do list,bg-orange-500",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([template], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "boards_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Use an uploaded file for import
  const handleUseFile = (file: UploadedFile) => {
    const rows = parseCSV(file.content);
    if (!rows.length || !Object.prototype.hasOwnProperty.call(rows[0], "title")) {
      setCsvStatus("error");
      setCsvMessage(`"${file.name}" does not have a "title" column.`);
      return;
    }
    setCsvPreview(rows.slice(0, 5));
    setCsvStatus("success");
    setCsvMessage(`Showing ${rows.length} board(s) from "${file.name}".`);
  };

  return (
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("boards")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors ${
            activeTab === "boards"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Boards
        </button>
        {isBoardPage && (
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors ${
              activeTab === "members"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Members
          </button>
        )}
        <button
          onClick={() => setActiveTab("csv")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors ${
            activeTab === "csv"
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <FileDown className="h-3.5 w-3.5" />
          CSV
        </button>
      </div>

      {/* ── MEMBERS TAB ── */}
      {activeTab === "members" && (
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">
            Project Members
          </p>
          {/* Owner */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              O
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">Owner</p>
              <p className="text-[10px] text-blue-600 font-medium">You</p>
            </div>
          </div>
          {/* Assignees */}
          {members && members.length > 0 ? (
            members.map((m) => (
              <div key={m.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-xs text-gray-700 truncate font-medium">{m.name}</p>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-gray-400 text-center py-4 italic">No members assigned yet</p>
          )}

          {/* Invite button inside Members tab */}
          {onInviteClick && (
            <button
              onClick={onInviteClick}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite via Email
            </button>
          )}
        </div>
      )}

      {/* ── BOARDS TAB ── */}
      {activeTab === "boards" && (
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">
            My Boards
          </p>
          {boards.length === 0 ? (
            <p className="text-[11px] text-gray-400 text-center py-6">No boards yet</p>
          ) : (
            boards.map((board: Board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors group ${
                  pathname === `/boards/${board.id}`
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded shrink-0 ${board.color}`} />
                <span className="truncate flex-1">{board.title}</span>
                <ChevronRight className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
              </Link>
            ))
          )}
        </nav>
      )}

      {/* ── CSV TAB ── */}
      {activeTab === "csv" && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">

          {/* ── 1. EXPORT ── */}
          <section>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Export Boards
            </p>
            <button
              onClick={handleExport}
              disabled={boards.length === 0}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-700 bg-white hover:bg-green-50 hover:border-green-300 hover:text-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Download as CSV
            </button>
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              {boards.length} board{boards.length !== 1 ? "s" : ""} will be exported
            </p>
          </section>

          <div className="border-t border-gray-100" />

          {/* ── 2. FILE MANAGER ── */}
          <section>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              File Manager
            </p>

            <button
              onClick={() => uploadFileRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-[11px] font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            >
              <FileUp className="h-3.5 w-3.5" />
              Upload CSV File
            </button>
            <input
              ref={uploadFileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); }}
            />

            {uploadedFiles.length === 0 ? (
              <div className="mt-2 py-5 text-center border border-dashed border-gray-200 rounded-lg">
                <FileText className="h-6 w-6 text-gray-200 mx-auto mb-1" />
                <p className="text-[10px] text-gray-400 font-medium">No files uploaded</p>
                <p className="text-[10px] text-gray-300 mt-0.5">Upload a .csv file above</p>
              </div>
            ) : (
              <div className="mt-2 space-y-1.5">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                    <div className="flex items-start gap-1.5">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-gray-700 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {formatSize(file.size)} · {file.uploadedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1 mt-1.5">
                      <button
                        onClick={() => handleUseFile(file)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <FileUp className="h-3 w-3" />
                        Use for Import
                      </button>

                      {deleteConfirmId === file.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="px-2 py-1 text-[10px] rounded bg-red-500 text-white hover:bg-red-600 font-medium transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-[10px] rounded border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(file.id)}
                          className="p-1 rounded border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="border-t border-gray-100" />

          {/* ── 3. IMPORT ── */}
          <section>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Import Boards
            </p>
            <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">
              Use a file from File Manager above, or drag & drop a CSV directly here.
            </p>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setIsDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleImportFile(f);
              }}
              onClick={() => importFileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              }`}
            >
              <FileUp className="h-6 w-6 text-gray-300 mx-auto mb-1.5" />
              <p className="text-[11px] font-medium text-gray-600">Drop CSV here</p>
              <p className="text-[10px] text-gray-400 mt-0.5">or click to browse</p>
              <input
                ref={importFileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
              />
            </div>

            <div className="mt-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-[9px] font-bold text-amber-600 mb-1">Required CSV columns:</p>
              <code className="text-[10px] text-amber-500 block mb-1.5">title, description, color</code>
              <p className="text-[10px] text-amber-500 mb-2">
                Only <strong>"title"</strong> is mandatory. Not sure about the format?
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] font-semibold transition-colors border border-amber-200"
              >
                <Download className="h-3 w-3" />
                Download Sample Template
              </button>
            </div>

            {csvStatus !== "idle" && (
              <div className={`mt-2 p-2 rounded-lg text-[11px] leading-snug flex items-start gap-1.5 ${
                csvStatus === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                <span className="flex-1">{csvMessage}</span>
                <button onClick={() => { setCsvStatus("idle"); setCsvMessage(""); }}>
                  <X className="h-3 w-3 opacity-50 hover:opacity-100" />
                </button>
              </div>
            )}

            {csvPreview.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  Preview — {csvPreview.length} rows
                </p>
                <div className="space-y-1">
                  {csvPreview.map((row, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-100 rounded-lg text-[11px]">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${row.color || "bg-blue-400"}`} />
                      <span className="truncate text-gray-700 flex-1">{row.title}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleClearImport}
                    className="w-full py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            )}
          </section>

        </div>
      )}
    </aside>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────
export default function Navbar({
  boardTitle,
  onEditBoard,
  onFilterClick,
  filterCount = 0,
  members,
  onInviteClick,
}: Props) {
  const { isSignedIn, user } = useUser();
  const pathname = usePathname();
  const isDashboardPage = pathname === "/dashboard";
  const isBoardPage = pathname.startsWith("/boards/");

  if (isDashboardPage) {
    return (
      <>
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="flex items-center justify-between px-4 py-3 sm:py-4">
            <div className="flex items-center space-x-2">
              <Trello className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <span className="text-xl sm:text-2xl font-bold text-gray-900">Trello Clone</span>
            </div>
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>
        <div className="fixed left-0 top-[57px] bottom-0 z-40">
          <DashboardSidebar />
        </div>
      </>
    );
  }

  if (isBoardPage) {
    return (
      <>
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
                <Link href="/dashboard" className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-gray-900 flex-shrink-0">
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Back to dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Link>
                <div className="h-4 sm:h-6 w-px bg-gray-300 hidden sm:block" />
                <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
                  <Trello className="text-blue-600" />
                  <span className="text-lg font-bold text-gray-900 truncate">{boardTitle}</span>
                  {onEditBoard && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 flex-shrink-0 p-0" onClick={onEditBoard}>
                      <MoreHorizontal />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                {onInviteClick && (
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={onInviteClick}>
                    <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Invite Member</span>
                    <span className="sm:hidden">Invite</span>
                  </Button>
                )}
                {onFilterClick && (
                  <Button variant="outline" size="sm" className={`text-xs sm:text-sm ${filterCount > 0 ? "bg-blue-100 border-blue-200" : ""}`} onClick={onFilterClick}>
                    <Filter className="h-3 w-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Filter</span>
                    {filterCount > 0 && <Badge variant="secondary" className="text-xs ml-1 sm:ml-2 bg-blue-100 border-blue-200">{filterCount}</Badge>}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>
        <div className="fixed left-0 top-[57px] bottom-0 z-40">
          <DashboardSidebar members={members} onInviteClick={onInviteClick} />
        </div>
      </>
    );
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trello className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          <span className="text-xl sm:text-2xl font-bold text-gray-900">Trello Clone</span>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {isSignedIn ? (
            <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
              <span className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                Welcome, {user.firstName ?? user.emailAddresses[0].emailAddress}
              </span>
              <Link href="/dashboard">
                <Button size="sm" className="text-xs sm:text-sm">Go to Dashboard <ArrowRight /></Button>
              </Link>
            </div>
          ) : (
            <div>
              <SignInButton><Button variant="ghost" size="sm" className="text-xs sm:text-sm">Sign In</Button></SignInButton>
              <SignUpButton><Button size="sm" className="text-xs sm:text-sm">Sign Up</Button></SignUpButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}