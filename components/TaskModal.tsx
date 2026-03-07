"use client";

import { useState } from "react";
import { Task } from "@/lib/supabase/models";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ImageIcon,
  Link2,
  Pencil,
  Save,
  Trash2,
  User,
  X,
} from "lucide-react";

interface TaskModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (
    taskId: string,
    updates: Partial<Pick<Task, "title" | "description" | "assignee" | "due_date" | "priority">>
  ) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  low: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

export default function TaskModal({
  task,
  open,
  onClose,
  onUpdate,
  onDelete,
}: TaskModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editLink, setEditLink] = useState("");

  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    assignee: task?.assignee ?? "",
    due_date: task?.due_date ?? "",
    priority: task?.priority ?? "medium",
  });

  // Sync form when task changes
  if (task && form.title === "" && task.title !== "") {
    setForm({
      title: task.title,
      description: task.description ?? "",
      assignee: task.assignee ?? "",
      due_date: task.due_date ?? "",
      priority: task.priority,
    });
  }

  const handleOpen = (open: boolean) => {
    if (!open) {
      setIsEditing(false);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleEdit = () => {
    if (!task) return;
    setForm({
      title: task.title,
      description: task.description ?? "",
      assignee: task.assignee ?? "",
      due_date: task.due_date ?? "",
      priority: task.priority,
    });
    setEditImages([]);
    setEditLink("");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!task || !form.title.trim()) return;
    try {
      setIsSaving(true);
      let description = form.description.trim() || null;
      if (editLink.trim()) description = (description ? description + "\n" : "") + `🔗 ${editLink.trim()}`;
      if (editImages.length > 0) description = (description ? description + "\n" : "") + `🖼️ ${editImages.join(", ")}`;
      await onUpdate(task.id, {
        title: form.title.trim(),
        description,
        assignee: form.assignee.trim() || null,
        due_date: form.due_date || null,
        priority: form.priority as Task["priority"],
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    try {
      setIsDeleting(true);
      await onDelete(task.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="w-[95vw] max-w-[500px] mx-auto max-h-[90vh] overflow-y-auto [&>button]:top-3 [&>button]:right-3">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-lg font-bold text-gray-900 leading-tight pr-8">
              {isEditing ? "Edit Task" : task.title}
            </DialogTitle>
            {!isEditing && (
              <Badge className={`text-xs shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Badge>
            )}
          </div>
          <DialogDescription className="sr-only">
            {isEditing ? "Edit task details" : "View task details"}
          </DialogDescription>
        </DialogHeader>

        {/* ── VIEW MODE ── */}
        {!isEditing && (
          <div className="space-y-4 pt-1">
            {/* Description - parse images and links */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Description
              </p>
              {(() => {
                const raw = task.description ?? "";
                if (!raw) return <p className="text-sm text-gray-400 italic">No description provided.</p>;

                // Split into lines, separate text, links (🔗), images (🖼️)
                const lines = raw.split("\n");
                const textLines: string[] = [];
                const links: string[] = [];
                const images: string[] = [];

                lines.forEach((line) => {
                  if (line.startsWith("🔗 ")) {
                    links.push(line.replace("🔗 ", "").trim());
                  } else if (line.startsWith("🖼️ ")) {
                    images.push(...line.replace("🖼️ ", "").split(", ").map(s => s.trim()));
                  } else {
                    textLines.push(line);
                  }
                });

                return (
                  <div className="space-y-3">
                    {textLines.join("\n").trim() && (
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {textLines.join("\n").trim()}
                      </p>
                    )}
                    {links.map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline break-all">
                        <Link2 className="h-3.5 w-3.5 shrink-0" />
                        {link}
                      </a>
                    ))}
                    {images.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {images.map((img, i) => (
                          <img key={i} src={img} alt={`attachment-${i}`}
                            className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                            onClick={() => window.open(img, "_blank")}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Assignee</p>
                  <p className="text-sm text-gray-700">{task.assignee || "Unassigned"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Due Date</p>
                  <p className="text-sm text-gray-700">
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })
                      : "No due date"}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              Created: {new Date(task.created_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </p>

            {/* Action buttons */}
            {!showDeleteConfirm ? (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  className="flex-1"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Task
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border border-red-200 rounded-lg p-3 bg-red-50 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">
                    Are you sure you want to delete this task? This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete"}
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EDIT MODE ── */}
        {isEditing && (
          <div className="space-y-4 pt-1">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="task-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Task title"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Description</Label>
              <textarea
                id="task-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Add a description..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Assignee + Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-assignee">Assignee</Label>
                <Input
                  id="task-assignee"
                  value={form.assignee}
                  onChange={(e) => setForm((p) => ({ ...p, assignee: e.target.value }))}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Name or email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-due">Due Date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as Task["priority"][]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                      form.priority === p
                        ? PRIORITY_STYLES[p] + " ring-2 ring-offset-1 ring-gray-300"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Images */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
                Attach Images
              </Label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="edit-task-images"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  Promise.all(
                    files.map(f => new Promise<string>(res => {
                      const r = new FileReader();
                      r.onload = () => res(r.result as string);
                      r.readAsDataURL(f);
                    }))
                  ).then(imgs => setEditImages(prev => [...prev, ...imgs]));
                }}
              />
              <label
                htmlFor="edit-task-images"
                className="flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600 cursor-pointer transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
                Click to add images
              </label>
              {editImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {editImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => setEditImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Link */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-gray-500" />
                Add Link
              </Label>
              <Input
                placeholder="https://example.com"
                value={editLink}
                onChange={(e) => setEditLink(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>

            {/* Save / Back */}
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={!form.title.trim() || isSaving}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                disabled={isSaving}
                className="flex items-center gap-1 px-3"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}