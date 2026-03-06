// "use client";

// import { useUser } from "@clerk/nextjs";
// import {
//   boardDataService,
//   boardService,
//   columnService,
//   taskService,
// } from "../services";
// import { useEffect, useState } from "react";
// import { Board, Column, ColumnWithTasks, Task } from "../supabase/models";
// import { useSupabase } from "../supabase/SupabaseProvider";

// export function useBoards() {
//   const { user } = useUser();
//   const { supabase } = useSupabase();
//   const [boards, setBoards] = useState<Board[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
// useEffect(() => {
//   if (user && supabase) {  // supabase bhi check karo
//     loadBoards();
//   }
// }, [user, supabase]);  // supabase dependency already hai

//   async function loadBoards() {
//    if (!user || !supabase) return;

//     try {
//       setLoading(true);
//       setError(null);
//       const data = await boardService.getBoards(supabase!, user.id);
//       setBoards(data);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load boards.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function createBoard(boardData: {
//     title: string;
//     description?: string;
//     color?: string;
//   }) {
//     if (!user) throw new Error("User not authenticated");

//     try {
//       const newBoard = await boardDataService.createBoardWithDefaultColumns(
//         supabase!,
//         {
//           ...boardData,
//           userId: user.id,
//         }
//       );
//       setBoards((prev) => [newBoard, ...prev]);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to create board.");
//     }
//   }

//   return { boards, loading, error, createBoard };
// }

// export function useBoard(boardId: string) {
//   const { supabase } = useSupabase();
//   const { user } = useUser();

//   const [board, setBoard] = useState<Board | null>(null);
//   const [columns, setColumns] = useState<ColumnWithTasks[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (boardId) {
//       loadBoard();
//     }
//   }, [boardId, supabase]);

//   async function loadBoard() {
//     if (!boardId) return;

//     try {
//       setLoading(true);
//       setError(null);
//       const data = await boardDataService.getBoardWithColumns(
//         supabase!,
//         boardId
//       );
//       setBoard(data.board);
//       setColumns(data.columnsWithTasks);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load boards.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function updateBoard(boardId: string, updates: Partial<Board>) {
//     try {
//       const updatedBoard = await boardService.updateBoard(
//         supabase!,
//         boardId,
//         updates
//       );
//       setBoard(updatedBoard);
//       return updatedBoard;
//     } catch (err) {
//       setError(
//         err instanceof Error ? err.message : "Failed to update the board."
//       );
//     }
//   }

//   async function createRealTask(
//     columnId: string,
//     taskData: {
//       title: string;
//       description?: string;
//       assignee?: string;
//       dueDate?: string;
//       priority?: "low" | "medium" | "high";
//     }
//   ) {
//     try {
//       const newTask = await taskService.createTask(supabase!, {
//         title: taskData.title,
//         description: taskData.description || null,
//         assignee: taskData.assignee || null,
//         due_date: taskData.dueDate || null,
//         column_id: columnId,
//         sort_order:
//           columns.find((col) => col.id === columnId)?.tasks.length || 0,
//         priority: taskData.priority || "medium",
//           user_id: user!.id, 
//       });

//       setColumns((prev) =>
//         prev.map((col) =>
//           col.id === columnId ? { ...col, tasks: [...col.tasks, newTask] } : col
//         )
//       );

//       return newTask;
//     } catch (err) {
//       setError(
//         err instanceof Error ? err.message : "Failed to create the task."
//       );
//     }
//   }

//   async function moveTask(
//     taskId: string,
//     newColumnId: string,
//     newOrder: number
//   ) {
//     try {
//       await taskService.moveTask(supabase!, taskId, newColumnId, newOrder);

//       setColumns((prev) => {
//         const newColumns = [...prev];

//         // Find and remove task from the old column
//         let taskToMove: Task | null = null;
//         for (const col of newColumns) {
//           const taskIndex = col.tasks.findIndex((task) => task.id === taskId);
//           if (taskIndex !== -1) {
//             taskToMove = col.tasks[taskIndex];
//             col.tasks.splice(taskIndex, 1);
//             break;
//           }
//         }

//         if (taskToMove) {
//           // Add task to new column
//           const targetColumn = newColumns.find((col) => col.id === newColumnId);
//           if (targetColumn) {
//             targetColumn.tasks.splice(newOrder, 0, taskToMove);
//           }
//         }

//         return newColumns;
//       });
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to move task.");
//     }
//   }

//   async function createColumn(title: string) {
//     if (!board || !user) throw new Error("Board not loaded");

//     try {
//       const newColumn = await columnService.createColumn(supabase!, {
//         title,
//         board_id: board.id,
//         sort_order: columns.length,
//         user_id: user.id,
//       });

//       setColumns((prev) => [...prev, { ...newColumn, tasks: [] }]);
//       return newColumn;
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to create column.");
//     }
//   }

//   async function updateColumn(columnId: string, title: string) {
//     try {
//       const updatedColumn = await columnService.updateColumnTitle(
//         supabase!,
//         columnId,
//         title
//       );

//       setColumns((prev) =>
//         prev.map((col) =>
//           col.id === columnId ? { ...col, ...updatedColumn } : col
//         )
//       );

//       return updatedColumn;
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to create column.");
//     }
//   }

//   return {
//     board,
//     columns,
//     loading,
//     error,
//     updateBoard,
//     createRealTask,
//     setColumns,
//     moveTask,
//     createColumn,
//     updateColumn,
//   };
// }

"use client";

import { useUser } from "@clerk/nextjs";
import {
  boardDataService,
  boardService,
  columnService,
  taskService,
} from "../services";
import { useEffect, useState } from "react";
import { Board, Column, ColumnWithTasks, Task } from "../supabase/models";
import { useSupabase } from "../supabase/SupabaseProvider";

export function useBoards() {
  const { user } = useUser();
  const { supabase } = useSupabase();
  const [boards, setBoards] = useState<Board[]>([]);
  // ✅ NEW: Shared boards alag state mein
  const [sharedBoards, setSharedBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && supabase) {
      loadBoards();
    }
  }, [user, supabase]);

  async function loadBoards() {
    if (!user || !supabase) return;

    try {
      setLoading(true);
      setError(null);

      // Apne boards fetch karo
      const myBoards = await boardService.getBoards(supabase, user.id);
      setBoards(myBoards);

      // ✅ NEW: Shared boards fetch karo (board_members table se)
      const sharedBoardIds = await getSharedBoardIds(user.id);
      if (sharedBoardIds.length > 0) {
        const { data: sharedData, error: sharedError } = await supabase
          .from("boards")
          .select("*")
          .in("id", sharedBoardIds)
          .order("created_at", { ascending: false });

        if (!sharedError && sharedData) {
          setSharedBoards(sharedData);
        }
      } else {
        setSharedBoards([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load boards.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW: board_members table se user ke shared board IDs nikalo
  async function getSharedBoardIds(userId: string): Promise<string[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("board_members")
      .select("board_id")
      .eq("user_id", userId);

    if (error || !data) return [];
    return data.map((row: { board_id: string }) => row.board_id);
  }

  async function createBoard(boardData: {
    title: string;
    description?: string;
    color?: string;
  }) {
    if (!user) throw new Error("User not authenticated");

    try {
      const newBoard = await boardDataService.createBoardWithDefaultColumns(
        supabase!,
        {
          ...boardData,
          userId: user.id,
        }
      );
      setBoards((prev) => [newBoard, ...prev]);
      return newBoard;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board.");
      throw err;
    }
  }

  // ✅ NEW: Doosre user ko board mein add karo
  async function addBoardMember(boardId: string, memberUserId: string) {
    if (!supabase) return;

    const { error } = await supabase.from("board_members").insert({
      board_id: boardId,
      user_id: memberUserId,
    });

    if (error) throw error;
  }

  // ✅ NEW: Board ke saare members fetch karo
  async function getBoardMembers(boardId: string) {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("board_members")
      .select("*")
      .eq("board_id", boardId);

    if (error) throw error;
    return data || [];
  }

  async function deleteBoard(boardId: string) {
    if (!supabase) return;

    try {
      await boardService.deleteBoard(supabase, boardId);
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete board.");
      throw err;
    }
  }

  return { boards, sharedBoards, loading, error, createBoard, deleteBoard, addBoardMember, getBoardMembers };
}

export function useBoard(boardId: string) {
  const { supabase } = useSupabase();
  const { user } = useUser();

  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<ColumnWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (boardId) {
      loadBoard();
    }
  }, [boardId, supabase]);

  async function loadBoard() {
    if (!boardId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await boardDataService.getBoardWithColumns(supabase!, boardId);
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
      const updatedBoard = await boardService.updateBoard(supabase!, boardId, updates);
      setBoard(updatedBoard);
      return updatedBoard;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update the board.");
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
    try {
      const newTask = await taskService.createTask(supabase!, {
        title: taskData.title,
        description: taskData.description || null,
        assignee: taskData.assignee || null,
        due_date: taskData.dueDate || null,
        column_id: columnId,
        sort_order: columns.find((col) => col.id === columnId)?.tasks.length || 0,
        priority: taskData.priority || "medium",
        user_id: user!.id,
      });

      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId ? { ...col, tasks: [...col.tasks, newTask] } : col
        )
      );

      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create the task.");
    }
  }

  async function moveTask(taskId: string, newColumnId: string, newOrder: number) {
    try {
      await taskService.moveTask(supabase!, taskId, newColumnId, newOrder);

      setColumns((prev) => {
        const newColumns = [...prev];
        let taskToMove: Task | null = null;

        for (const col of newColumns) {
          const taskIndex = col.tasks.findIndex((task) => task.id === taskId);
          if (taskIndex !== -1) {
            taskToMove = col.tasks[taskIndex];
            col.tasks.splice(taskIndex, 1);
            break;
          }
        }

        if (taskToMove) {
          const targetColumn = newColumns.find((col) => col.id === newColumnId);
          if (targetColumn) {
            targetColumn.tasks.splice(newOrder, 0, taskToMove);
          }
        }

        return newColumns;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move task.");
    }
  }

  async function createColumn(title: string) {
    if (!board || !user) throw new Error("Board not loaded");

    try {
      const newColumn = await columnService.createColumn(supabase!, {
        title,
        board_id: board.id,
        sort_order: columns.length,
        user_id: user.id,
      });

      setColumns((prev) => [...prev, { ...newColumn, tasks: [] }]);
      return newColumn;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create column.");
    }
  }

  async function updateColumn(columnId: string, title: string) {
    try {
      const updatedColumn = await columnService.updateColumnTitle(supabase!, columnId, title);
      setColumns((prev) =>
        prev.map((col) => (col.id === columnId ? { ...col, ...updatedColumn } : col))
      );
      return updatedColumn;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update column.");
    }
  }

  async function updateTask(
    taskId: string,
    updates: Partial<Pick<Task, "title" | "description" | "assignee" | "due_date" | "priority">>
  ) {
    try {
      const updatedTask = await taskService.updateTask(supabase!, taskId, updates);
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t)),
        }))
      );
      return updatedTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task.");
      throw err;
    }
  }

  async function deleteTask(taskId: string) {
    try {
      await taskService.deleteTask(supabase!, taskId);
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