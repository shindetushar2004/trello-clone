// "use client";

// import Navbar from "@/components/navbar";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Dialog,
//   DialogHeader,
//   DialogContent,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { usePlan } from "@/lib/contexts/PlanContext";
// import { useBoards } from "@/lib/hooks/useBoards";
// import { Board } from "@/lib/supabase/models";
// import { useUser } from "@clerk/nextjs";
// import {
//   Filter,
//   Grid3x3,
//   List,
//   Loader2,
//   Plus,
//   Rocket,
//   Search,
//   Trello,
// } from "lucide-react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useState } from "react";

// export default function DashboardPage() {
//   const { user } = useUser();
//   const { createBoard, boards, loading, error } = useBoards();
//   const router = useRouter();
//   const { isFreeUser } = usePlan();
//   const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
//   const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
//   const [showUpgradeDialog, setShowUpgradeDialog] = useState<boolean>(false);

//   const [filters, setFilters] = useState({
//     search: "",
//     dateRange: {
//       start: null as string | null,
//       end: null as string | null,
//     },
//     taskCount: {
//       min: null as number | null,
//       max: null as number | null,
//     },
//   });

//   const canCreateBoard = !isFreeUser || boards.length < 1;

//   const boardsWithTaskCount = boards.map((board: Board) => ({
//     ...board,
//     taskCount: 0, // This would need to be calculated from actual data
//   }));

//   const filteredBoards = boardsWithTaskCount.filter((board: Board) => {
//     const matchesSearch = board.title
//       .toLowerCase()
//       .includes(filters.search.toLowerCase());

//     const matchesDateRange =
//       (!filters.dateRange.start ||
//         new Date(board.created_at) >= new Date(filters.dateRange.start)) &&
//       (!filters.dateRange.end ||
//         new Date(board.created_at) <= new Date(filters.dateRange.end));

//     return matchesSearch && matchesDateRange;
//   });

//   function clearFilters() {
//     setFilters({
//       search: "",
//       dateRange: {
//         start: null as string | null,
//         end: null as string | null,
//       },
//       taskCount: {
//         min: null as number | null,
//         max: null as number | null,
//       },
//     });
//   }

//   const handleCreateBoard = async () => {
//     if (!canCreateBoard) {
//       setShowUpgradeDialog(true);
//       return;
//     }
//     await createBoard({ title: "New Board" });
//   };

//   // if (loading) {
//   //   return (
//   //     <div>
//   //       <Loader2 /> <span>Loading your boards...</span>
//   //     </div>
//   //   );
//   // }

//   if (error) {
//     return (
//       <div>
//         <h2> Error loading boards</h2>
//         <p>{error}</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <Navbar />

//       <main className="container mx-auto px-4 py-6 sm:py-8">
//         <div className="mb-6 sm:mb-8">
//           <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
//             Welcome back,{" "}
//             {user?.firstName ?? user?.emailAddresses[0].emailAddress}! 👋
//           </h1>
//           <p className="text-gray-600">
//             Here's what's happening with your boards today.
//           </p>
//         </div>

//         {/* Stats */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
//           <Card>
//             <CardContent className="p-4 sm:p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-xs sm:text-sm font-medium text-gray-600">
//                     Total Boards
//                   </p>
//                   <p className="text-xl sm:text-2xl font-bold text-gray-900">
//                     {boards.length}
//                   </p>
//                 </div>
//                 <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 rounded-lg flex items-center justify-center">
//                   <Trello className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="p-4 sm:p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-xs sm:text-sm font-medium text-gray-600">
//                     Active Projects
//                   </p>
//                   <p className="text-xl sm:text-2xl font-bold text-gray-900">
//                     {boards.length}
//                   </p>
//                 </div>
//                 <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-100 rounded-lg flex items-center justify-center">
//                   <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="p-4 sm:p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-xs sm:text-sm font-medium text-gray-600">
//                     Recent Activity
//                   </p>
//                   <p className="text-xl sm:text-2xl font-bold text-gray-900">
//                     {
//                       boards.filter((board) => {
//                         const updatedAt = new Date(board.updated_at);
//                         const oneWeekAgo = new Date();
//                         oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
//                         return updatedAt > oneWeekAgo;
//                       }).length
//                     }
//                   </p>
//                 </div>
//                 <div className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-100 rounded-lg flex items-center justify-center">
//                   📊
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="p-4 sm:p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-xs sm:text-sm font-medium text-gray-600">
//                     Total Boards
//                   </p>
//                   <p className="text-xl sm:text-2xl font-bold text-gray-900">
//                     {boards.length}
//                   </p>
//                 </div>
//                 <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 rounded-lg flex items-center justify-center">
//                   <Trello className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Boards */}
//         <div className="mb-6 sm:mb-8">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
//             <div>
//               <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
//                 Your Boards
//               </h2>
//               <p className="text-gray-600">Manage your projects and tasks</p>
//               {isFreeUser && (
//                 <p className="text-sm text-gray-500 mt-1">
//                   Free plan: {boards.length}/1 boards used
//                 </p>
//               )}
//             </div>

//             <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
//               <div className="flex items-center space-x-2 rounded bg-white border p-1">
//                 <Button
//                   variant={viewMode === "grid" ? "default" : "ghost"}
//                   size="sm"
//                   onClick={() => setViewMode("grid")}
//                 >
//                   <Grid3x3 />
//                 </Button>
//                 <Button
//                   variant={viewMode === "list" ? "default" : "ghost"}
//                   size="sm"
//                   onClick={() => setViewMode("list")}
//                 >
//                   <List />
//                 </Button>
//               </div>

//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => setIsFilterOpen(true)}
//               >
//                 <Filter />
//                 Filter
//               </Button>

//               <Button onClick={handleCreateBoard}>
//                 <Plus />
//                 Create Board
//               </Button>
//             </div>
//           </div>
//           {/* Search Bar */}
//           <div className="relative mb-4 sm:mb-6">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
//             <Input
//               id="search"
//               placeholder="Search boards..."
//               className="pl-10"
//               onChange={(e) =>
//                 setFilters((prev) => ({ ...prev, search: e.target.value }))
//               }
//             />
//           </div>

//           {/* Boards Grid/List */}
//           {boards.length === 0 ? (
//             <div>No boards yet</div>
//           ) : viewMode === "grid" ? (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
//               {filteredBoards.map((board, key) => (
//                 <Link href={`/boards/${board.id}`} key={key}>
//                   <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
//                     <CardHeader className="pb-3">
//                       <div className="flex items-center justify-between">
//                         <div className={`w-4 h-4 ${board.color} rounded`} />
//                         <Badge className="text-xs" variant="secondary">
//                           New
//                         </Badge>
//                       </div>
//                     </CardHeader>
//                     <CardContent className="p-4 sm:p-6">
//                       <CardTitle className="text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors">
//                         {board.title}
//                       </CardTitle>
//                       <CardDescription className="text-sm mb-4">
//                         {board.description}
//                       </CardDescription>
//                       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
//                         <span>
//                           Created{" "}
//                           {new Date(board.created_at).toLocaleDateString()}
//                         </span>
//                         <span>
//                           Updated{" "}
//                           {new Date(board.updated_at).toLocaleDateString()}
//                         </span>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 </Link>
//               ))}

//               <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer group">
//                 <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
//                   <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-2" />
//                   <p className="text-sm sm:text-base text-gray-600 group-hover:text-blue-600 font-medium">
//                     Create new board
//                   </p>
//                 </CardContent>
//               </Card>
//             </div>
//           ) : (
//             <div>
//               {boards.map((board, key) => (
//                 <div key={key} className={key > 0 ? "mt-4" : ""}>
//                   <Link href={`/boards/${board.id}`}>
//                     <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
//                       <CardHeader className="pb-3">
//                         <div className="flex items-center justify-between">
//                           <div className={`w-4 h-4 ${board.color} rounded`} />
//                           <Badge className="text-xs" variant="secondary">
//                             New
//                           </Badge>
//                         </div>
//                       </CardHeader>
//                       <CardContent className="p-4 sm:p-6">
//                         <CardTitle className="text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors">
//                           {board.title}
//                         </CardTitle>
//                         <CardDescription className="text-sm mb-4">
//                           {board.description}
//                         </CardDescription>
//                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
//                           <span>
//                             Created{" "}
//                             {new Date(board.created_at).toLocaleDateString()}
//                           </span>
//                           <span>
//                             Updated{" "}
//                             {new Date(board.updated_at).toLocaleDateString()}
//                           </span>
//                         </div>
//                       </CardContent>
//                     </Card>
//                   </Link>
//                 </div>
//               ))}

//               <Card className="mt-4 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer group">
//                 <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
//                   <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-2" />
//                   <p className="text-sm sm:text-base text-gray-600 group-hover:text-blue-600 font-medium">
//                     Create new board
//                   </p>
//                 </CardContent>
//               </Card>
//             </div>
//           )}
//         </div>
//       </main>

//       {/* Filter Dialog */}
//       <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
//         <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
//           <DialogHeader>
//             <DialogTitle>Filter Boards</DialogTitle>
//             <p className="text-sm text-gray-600">
//               Filter boards by title, date, or task count.
//             </p>
//           </DialogHeader>
//           <div className="space-y-4">
//             <div className="space-y-2">
//               <Label>Search</Label>
//               <Input
//                 id="search"
//                 placeholder="Search board titles..."
//                 onChange={(e) =>
//                   setFilters((prev) => ({ ...prev, search: e.target.value }))
//                 }
//               />
//             </div>
//             <div className="space-y-2">
//               <Label>Date Range</Label>
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                 <div>
//                   <Label className="text-xs">Start Date</Label>
//                   <Input
//                     type="date"
//                     onChange={(e) =>
//                       setFilters((prev) => ({
//                         ...prev,
//                         dateRange: {
//                           ...prev.dateRange,
//                           start: e.target.value || null,
//                         },
//                       }))
//                     }
//                   />
//                 </div>
//                 <div>
//                   <Label className="text-xs">End Date</Label>
//                   <Input
//                     type="date"
//                     onChange={(e) =>
//                       setFilters((prev) => ({
//                         ...prev,
//                         dateRange: {
//                           ...prev.dateRange,
//                           end: e.target.value || null,
//                         },
//                       }))
//                     }
//                   />
//                 </div>
//               </div>
//             </div>
//             <div className="space-y-2">
//               <Label>Task Count</Label>
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                 <div>
//                   <Label className="text-xs">Minimum</Label>
//                   <Input
//                     type="number"
//                     min="0"
//                     placeholder="Min tasks"
//                     onChange={(e) =>
//                       setFilters((prev) => ({
//                         ...prev,
//                         taskCount: {
//                           ...prev.taskCount,
//                           min: e.target.value ? Number(e.target.value) : null,
//                         },
//                       }))
//                     }
//                   />
//                 </div>
//                 <div>
//                   <Label className="text-xs">Maximum</Label>
//                   <Input
//                     type="number"
//                     min="0"
//                     placeholder="Max tasks"
//                     onChange={(e) =>
//                       setFilters((prev) => ({
//                         ...prev,
//                         taskCount: {
//                           ...prev.taskCount,
//                           max: e.target.value ? Number(e.target.value) : null,
//                         },
//                       }))
//                     }
//                   />
//                 </div>
//               </div>
//             </div>

//             <div className="flex flex-col sm:flex-row justify-between pt-4 space-y-2 sm:space-y-0 sm:space-x-2">
//               <Button variant="outline" onClick={clearFilters}>
//                 Clear Filters
//               </Button>
//               <Button onClick={() => setIsFilterOpen(false)}>
//                 Apply Filters
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>

//       <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
//         <DialogContent className="w-[95vw] max-w-[425px] mx-auto">
//           <DialogHeader>
//             <DialogTitle>Upgrade to Create More Boards</DialogTitle>
//             <p className="text-sm text-gray-600">
//               Free users can only create one board. Upgrade to Pro or Enterprise
//               to create unlimited boards.
//             </p>
//           </DialogHeader>
//           <div className="flex justify-end space-x-4 pt-4">
//             <Button
//               variant="outline"
//               onClick={() => setShowUpgradeDialog(false)}
//             >
//               Cancel
//             </Button>
//             <Button onClick={() => router.push("/pricing")}>View Plans</Button>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

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
import { Board } from "@/lib/supabase/models";
import { useUser } from "@clerk/nextjs";
import {
  Filter,
  Grid3x3,
  List,
  Plus,
  Rocket,
  Search,
  Trello,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Board color options
const BOARD_COLORS = [
  { label: "Blue", value: "bg-blue-500" },
  { label: "Green", value: "bg-green-500" },
  { label: "Purple", value: "bg-purple-500" },
  { label: "Red", value: "bg-red-500" },
  { label: "Orange", value: "bg-orange-500" },
  { label: "Pink", value: "bg-pink-500" },
];

export default function DashboardPage() {
  const { user } = useUser();
  const { createBoard, boards, sharedBoards, loading, error } = useBoards();
  const router = useRouter();
  const { isFreeUser } = usePlan();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState<boolean>(false);

  // ✅ NEW: Create Board Modal State
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newBoardData, setNewBoardData] = useState({
    title: "",
    description: "",
    color: "bg-blue-500",
  });

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

  // ✅ FIXED: Ab click karne par modal khulega
  const handleCreateBoardClick = () => {
    if (!canCreateBoard) {
      setShowUpgradeDialog(true);
      return;
    }
    setNewBoardData({ title: "", description: "", color: "bg-blue-500" });
    setShowCreateDialog(true);
  };

  // ✅ NEW: Modal se board banao
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

  // Board Card Component (reusable)
  const BoardCard = ({ board, isShared = false }: { board: Board; isShared?: boolean }) => (
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
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-6 sm:py-8">
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

        {/* Toolbar */}
        <div className="mb-4 sm:mb-6">
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
                <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")}>
                  <Grid3x3 />
                </Button>
                <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")}>
                  <List />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(true)}>
                <Filter />
                Filter
              </Button>
              {/* ✅ FIXED: Top button bhi modal kholega */}
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
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>

        {/* MY BOARDS SECTION */}
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
              {/* ✅ FIXED: Create new board card pe onClick laga */}
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

        {/* ✅ NEW: SHARED BOARDS SECTION */}
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
      </main>

      {/* ✅ NEW: Create Board Modal */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] max-w-[450px] mx-auto">
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <p className="text-sm text-gray-600">
              Add a title and description for your new board.
            </p>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Title */}
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

            {/* Description */}
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

            {/* Color Picker */}
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

            {/* Preview */}
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

            {/* Buttons */}
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
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
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
              Free users can only create one board. Upgrade to Pro or Enterprise to create unlimited boards.
            </p>
          </DialogHeader>
          <div className="flex justify-end space-x-4 pt-4">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>Cancel</Button>
            <Button onClick={() => router.push("/pricing")}>View Plans</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}