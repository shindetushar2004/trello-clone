import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase/client";
import { Board, Column, Task } from "./firebase/models";

// ── Helper: Firestore doc → typed object ─────────────────────────
function toBoard(id: string, data: any): Board {
  return {
    id,
    title: data.title,
    description: data.description ?? null,
    color: data.color ?? "bg-blue-500",
    user_id: data.user_id,
    created_at: data.created_at instanceof Timestamp
      ? data.created_at.toDate().toISOString()
      : data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at instanceof Timestamp
      ? data.updated_at.toDate().toISOString()
      : data.updated_at ?? new Date().toISOString(),
  };
}

function toColumn(id: string, data: any): Column {
  return {
    id,
    board_id: data.board_id,
    title: data.title,
    sort_order: data.sort_order ?? 0,
    user_id: data.user_id,
    created_at: data.created_at instanceof Timestamp
      ? data.created_at.toDate().toISOString()
      : data.created_at ?? new Date().toISOString(),
  };
}

function toTask(id: string, data: any): Task {
  return {
    id,
    column_id: data.column_id,
    user_id: data.user_id,
    title: data.title,
    description: data.description ?? null,
    assignee: data.assignee ?? null,
    due_date: data.due_date ?? null,
    priority: data.priority ?? "medium",
    sort_order: data.sort_order ?? 0,
    created_at: data.created_at instanceof Timestamp
      ? data.created_at.toDate().toISOString()
      : data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at instanceof Timestamp
      ? data.updated_at.toDate().toISOString()
      : data.updated_at ?? new Date().toISOString(),
  };
}

// ── Board Service ─────────────────────────────────────────────────
export const boardService = {
  async getBoard(boardId: string): Promise<Board> {
    const ref = doc(db, "boards", boardId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Board not found");
    return toBoard(snap.id, snap.data());
  },

  async getBoards(userId: string): Promise<Board[]> {
    const q = query(
      collection(db, "boards"),
      where("user_id", "==", userId)
    );
    const snap = await getDocs(q);
    const boards = snap.docs.map((d) => toBoard(d.id, d.data()));
    return boards.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async createBoard(
    board: Omit<Board, "id" | "created_at" | "updated_at">
  ): Promise<Board> {
    const now = new Date().toISOString();
    const ref = await addDoc(collection(db, "boards"), {
      ...board,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return { ...board, id: ref.id, created_at: now, updated_at: now };
  },

  async updateBoard(boardId: string, updates: Partial<Board>): Promise<Board> {
    const ref = doc(db, "boards", boardId);
    await updateDoc(ref, { ...updates, updated_at: serverTimestamp() });
    const snap = await getDoc(ref);
    return toBoard(snap.id, snap.data());
  },

  async deleteBoard(boardId: string): Promise<void> {
    const batch = writeBatch(db);

    // Delete all columns + tasks under this board
    const colSnap = await getDocs(collection(db, "boards", boardId, "columns"));
    for (const colDoc of colSnap.docs) {
      const taskSnap = await getDocs(
        collection(db, "boards", boardId, "columns", colDoc.id, "tasks")
      );
      taskSnap.docs.forEach((t) => batch.delete(t.ref));
      batch.delete(colDoc.ref);
    }
    batch.delete(doc(db, "boards", boardId));
    await batch.commit();
  },
};

// ── Column Service ────────────────────────────────────────────────
export const columnService = {
  async getColumns(boardId: string): Promise<Column[]> {
    const q = query(
      collection(db, "boards", boardId, "columns"),
      orderBy("sort_order", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toColumn(d.id, d.data()));
  },

  async createColumn(
    column: Omit<Column, "id" | "created_at">
  ): Promise<Column> {
    const now = new Date().toISOString();
    const ref = await addDoc(
      collection(db, "boards", column.board_id, "columns"),
      { ...column, created_at: serverTimestamp() }
    );
    return { ...column, id: ref.id, created_at: now };
  },

  async updateColumnTitle(
    boardId: string,
    columnId: string,
    title: string
  ): Promise<Column> {
    const ref = doc(db, "boards", boardId, "columns", columnId);
    await updateDoc(ref, { title });
    const snap = await getDoc(ref);
    return toColumn(snap.id, snap.data());
  },
};

// ── Task Service ──────────────────────────────────────────────────
export const taskService = {
  async getTasksByBoard(boardId: string): Promise<Task[]> {
    const colSnap = await getDocs(collection(db, "boards", boardId, "columns"));
    const allTasks: Task[] = [];

    for (const colDoc of colSnap.docs) {
      const taskSnap = await getDocs(
        query(
          collection(db, "boards", boardId, "columns", colDoc.id, "tasks"),
          orderBy("sort_order", "asc")
        )
      );
      taskSnap.docs.forEach((t) => allTasks.push(toTask(t.id, t.data())));
    }
    return allTasks;
  },

  async createTask(
    boardId: string,
    task: Omit<Task, "id" | "created_at" | "updated_at">
  ): Promise<Task> {
    const now = new Date().toISOString();
    const ref = await addDoc(
      collection(db, "boards", boardId, "columns", task.column_id, "tasks"),
      { ...task, created_at: serverTimestamp(), updated_at: serverTimestamp() }
    );
    return { ...task, id: ref.id, created_at: now, updated_at: now };
  },

  async moveTask(
    boardId: string,
    taskId: string,
    oldColumnId: string,
    newColumnId: string,
    newOrder: number,
    taskData: Task
  ): Promise<void> {
    const batch = writeBatch(db);

    // Old location se delete karo
    const oldRef = doc(db, "boards", boardId, "columns", oldColumnId, "tasks", taskId);
    batch.delete(oldRef);

    // New location pe add karo
    const newRef = doc(db, "boards", boardId, "columns", newColumnId, "tasks", taskId);
    batch.set(newRef, {
      ...taskData,
      column_id: newColumnId,
      sort_order: newOrder,
      updated_at: serverTimestamp(),
    });

    await batch.commit();
  },

  async updateTask(
    boardId: string,
    columnId: string,
    taskId: string,
    updates: Partial<Pick<Task, "title" | "description" | "assignee" | "due_date" | "priority">>
  ): Promise<Task> {
    const ref = doc(db, "boards", boardId, "columns", columnId, "tasks", taskId);
    await updateDoc(ref, { ...updates, updated_at: serverTimestamp() });
    const snap = await getDoc(ref);
    return toTask(snap.id, snap.data());
  },

  async deleteTask(
    boardId: string,
    columnId: string,
    taskId: string
  ): Promise<void> {
    await deleteDoc(
      doc(db, "boards", boardId, "columns", columnId, "tasks", taskId)
    );
  },
};

// ── Board Data Service ────────────────────────────────────────────
export const boardDataService = {
  async getBoardWithColumns(boardId: string) {
    const [board, columns] = await Promise.all([
      boardService.getBoard(boardId),
      columnService.getColumns(boardId),
    ]);

    const tasks = await taskService.getTasksByBoard(boardId);

    const columnsWithTasks = columns.map((column) => ({
      ...column,
      tasks: tasks
        .filter((t) => t.column_id === column.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));

    return { board, columnsWithTasks };
  },

  async createBoardWithDefaultColumns(boardData: {
    title: string;
    description?: string;
    color?: string;
    userId: string;
  }): Promise<Board> {
    const board = await boardService.createBoard({
      title: boardData.title,
      description: boardData.description || null,
      color: boardData.color || "bg-blue-500",
      user_id: boardData.userId,
    });

    const defaultColumns = [
      { title: "To Do", sort_order: 0 },
      { title: "In Progress", sort_order: 1 },
      { title: "Review", sort_order: 2 },
      { title: "Done", sort_order: 3 },
    ];

    await Promise.all(
      defaultColumns.map((col) =>
        columnService.createColumn({
          ...col,
          board_id: board.id,
          user_id: boardData.userId,
        })
      )
    );

    return board;
  },
};