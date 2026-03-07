"use client";

import { useUser } from "@clerk/nextjs";
import {
  boardDataService,
  boardService,
  columnService,
  taskService,
} from "../services";
import { useEffect, useState } from "react";
import { Board, Column, ColumnWithTasks, Task } from "../firebase/models";
import { db } from "../firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

// ── useBoards ─────────────────────────────────────────────────────
export function useBoards() {
  const { user } = useUser();
  const [boards, setBoards] = useState<Board[]>([]);
  const [sharedBoards, setSharedBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadBoards();
  }, [user]);

  async function loadBoards() {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      // Apne boards
      const myBoards = await boardService.getBoards(user.id);
      setBoards(myBoards);

      // Shared boards
      const sharedBoardIds = await getSharedBoardIds(user.id);
      if (sharedBoardIds.length > 0) {
        const shared: Board[] = [];
        for (const id of sharedBoardIds) {
          try {
            const b = await boardService.getBoard(id);
            shared.push(b);
          } catch {}
        }
        setSharedBoards(shared);
      } else {
        setSharedBoards([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load boards.");
    } finally {
      setLoading(false);
    }
  }

  async function getSharedBoardIds(userId: string): Promise<string[]> {
    const q = query(
      collection(db, "board_members"),
      where("user_id", "==", userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().board_id as string);
  }

  async function createBoard(boardData: {
    title: string;
    description?: string;
    color?: string;
  }) {
    if (!user) throw new Error("Not authenticated");
    try {
      const newBoard = await boardDataService.createBoardWithDefaultColumns({
        ...boardData,
        userId: user.id,
      });
      setBoards((prev) => [newBoard, ...prev]);
      return newBoard;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board.");
      throw err;
    }
  }

  async function deleteBoard(boardId: string) {
    try {
      await boardService.deleteBoard(boardId);
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete board.");
      throw err;
    }
  }

  async function addBoardMember(boardId: string, memberUserId: string) {
    const ref = doc(db, "board_members", `${boardId}_${memberUserId}`);
    await setDoc(ref, { board_id: boardId, user_id: memberUserId });
  }

  async function getBoardMembers(boardId: string) {
    const q = query(
      collection(db, "board_members"),
      where("board_id", "==", boardId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }

  return {
    boards,
    sharedBoards,
    loading,
    error,
    createBoard,
    deleteBoard,
    addBoardMember,
    getBoardMembers,
  };
}

// ── useBoard ──────────────────────────────────────────────────────
export function useBoard(boardId: string) {
  const { user } = useUser();
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<ColumnWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (boardId) loadBoard();
  }, [boardId]);

  async function loadBoard() {
    try {
      setLoading(true);
      setError(null);
      const data = await boardDataService.getBoardWithColumns(boardId);
      setBoard(data.board);
      setColumns(data.columnsWithTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board.");
    } finally {
      setLoading(false);
    }
  }

  async function updateBoard(boardId: string, updates: Partial<Board>) {
    try {
      const updated = await boardService.updateBoard(boardId, updates);
      setBoard(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update board.");
    }
  }

  async function createRealTask(
    columnId: string,
    taskData: {
      title: string;
      description?: string;
      assignee?: string;
      dueDate?: string;
      priority?: "low" | "medium" | "high";
    }
  ) {
    if (!user) return;
    try {
      const newTask = await taskService.createTask(boardId, {
        title: taskData.title,
        description: taskData.description || null,
        assignee: taskData.assignee || null,
        due_date: taskData.dueDate || null,
        column_id: columnId,
        sort_order:
          columns.find((c) => c.id === columnId)?.tasks.length || 0,
        priority: taskData.priority || "medium",
        user_id: user.id,
      });
      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId
            ? { ...col, tasks: [...col.tasks, newTask] }
            : col
        )
      );
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    }
  }

  async function moveTask(
    taskId: string,
    newColumnId: string,
    newOrder: number
  ) {
    try {
      // Find task and its current column
      let taskToMove: Task | null = null;
      let oldColumnId = "";
      for (const col of columns) {
        const found = col.tasks.find((t) => t.id === taskId);
        if (found) {
          taskToMove = found;
          oldColumnId = col.id;
          break;
        }
      }
      if (!taskToMove) return;

      await taskService.moveTask(
        boardId,
        taskId,
        oldColumnId,
        newColumnId,
        newOrder,
        taskToMove
      );

      setColumns((prev) => {
        const next = [...prev];
        let moving: Task | null = null;
        for (const col of next) {
          const idx = col.tasks.findIndex((t) => t.id === taskId);
          if (idx !== -1) {
            moving = col.tasks[idx];
            col.tasks.splice(idx, 1);
            break;
          }
        }
        if (moving) {
          const target = next.find((c) => c.id === newColumnId);
          if (target) target.tasks.splice(newOrder, 0, moving);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move task.");
    }
  }

  async function createColumn(title: string) {
    if (!board || !user) throw new Error("Board not loaded");
    try {
      const newCol = await columnService.createColumn({
        title,
        board_id: board.id,
        sort_order: columns.length,
        user_id: user.id,
      });
      setColumns((prev) => [...prev, { ...newCol, tasks: [] }]);
      return newCol;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create column.");
    }
  }

  async function updateColumn(columnId: string, title: string) {
    try {
      const updated = await columnService.updateColumnTitle(
        boardId,
        columnId,
        title
      );
      setColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, ...updated } : c))
      );
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update column.");
    }
  }

  async function updateTask(
    taskId: string,
    updates: Partial<
      Pick<Task, "title" | "description" | "assignee" | "due_date" | "priority">
    >
  ) {
    // Find columnId for this task
    let columnId = "";
    for (const col of columns) {
      if (col.tasks.find((t) => t.id === taskId)) {
        columnId = col.id;
        break;
      }
    }
    try {
      const updated = await taskService.updateTask(
        boardId,
        columnId,
        taskId,
        updates
      );
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updated } : t
          ),
        }))
      );
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task.");
      throw err;
    }
  }

  async function deleteTask(taskId: string) {
    let columnId = "";
    for (const col of columns) {
      if (col.tasks.find((t) => t.id === taskId)) {
        columnId = col.id;
        break;
      }
    }
    try {
      await taskService.deleteTask(boardId, columnId, taskId);
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task.");
      throw err;
    }
  }

  return {
    board,
    columns,
    loading,
    error,
    updateBoard,
    createRealTask,
    setColumns,
    moveTask,
    createColumn,
    updateColumn,
    updateTask,
    deleteTask,
  };
}