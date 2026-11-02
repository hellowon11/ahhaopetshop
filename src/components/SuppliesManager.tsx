import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowUpToLine,
  ChevronDown,
  Edit,
  Menu,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { apiService } from "../services/apiService";
import { PetSupply, SupplyCategory } from "../types";
import {
  FALLBACK_SUPPLIES,
  SUPPLY_CATEGORY_LABELS,
} from "../data/fallbackSupplies";
import { clearSuppliesCache } from "../utils/pageDataCache";
import ConfirmDialog from "./ConfirmDialog";
import Toast, { ToastState } from "./Toast";

const EMPTY_FORM = {
  name: "",
  category: "treats" as SupplyCategory,
  description: "",
  price: "",
  displayPrice: "",
  imageUrl: "",
  active: true,
};

const CATEGORY_OPTIONS: { value: "all" | SupplyCategory; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "dog-food", label: "Dog Food" },
  { value: "cat-food", label: "Cat Food" },
  { value: "treats", label: "Treats & Snacks" },
  { value: "toys", label: "Toys" },
  { value: "accessories", label: "Accessories" },
];

const MOVE_CATEGORY_OPTIONS: { value: SupplyCategory; label: string }[] = [
  { value: "dog-food", label: "Dog Food" },
  { value: "cat-food", label: "Cat Food" },
  { value: "treats", label: "Treats & Snacks" },
  { value: "toys", label: "Toys" },
  { value: "accessories", label: "Accessories" },
];

const SuppliesManager: React.FC = () => {
  const [items, setItems] = useState<PetSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | SupplyCategory>(
    "all",
  );
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden">(
    "all",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PetSupply | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [draftItems, setDraftItems] = useState<PetSupply[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  type DragGhost = {
    id: string;
    fromIndex: number;
    overIndex: number;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  /** Drag uses CSS transforms only — React state updates once on drop. */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragSize, setDragSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const dragGhostRef = useRef<DragGhost | null>(null);
  const ghostElRef = useRef<HTMLDivElement | null>(null);
  const draftItemsRef = useRef<PetSupply[]>([]);
  const rowElsRef = useRef<Map<string, HTMLElement>>(new Map());
  /** Document/content Y of each row at drag start (survives scrolling). */
  const rowTopsRef = useRef<number[]>([]);
  const scrollParentRef = useRef<HTMLElement | Window>(window);
  const autoScrollRef = useRef<number | null>(null);
  const lastPointerYRef = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);

  const showToast = useCallback(
    (message: string, type: ToastState["type"] = "success") => {
      setToast({ message, type });
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await apiService.supplies.getAll({ activeOnly: false });
      setItems(data);
      setUsingFallback(false);
    } catch (err) {
      console.error("Failed to load pet_supplies:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message || "")
          : err instanceof Error
            ? err.message
            : "Unknown error";
      setLoadError(message);
      setItems(FALLBACK_SUPPLIES);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPreview(null);
    setIsModalOpen(true);
  };

  const openEdit = (item: PetSupply) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      description: item.description,
      price: String(item.price),
      displayPrice: item.displayPrice,
      imageUrl: item.imageUrl,
      active: item.active,
    });
    setPreview(item.imageUrl);
    setIsModalOpen(true);
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (usingFallback) {
      showToast("Run the pet_supplies migration before uploading.", "error");
      return;
    }
    try {
      setUploading(true);
      const url = await apiService.supplies.uploadImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
      setPreview(url);
      showToast("Image uploaded");
    } catch (err) {
      console.error(err);
      showToast("Image upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usingFallback) {
      showToast(
        "Run migration 005_pet_supplies.sql in Supabase first.",
        "error",
      );
      return;
    }
    if (!form.name.trim() || !form.imageUrl || !form.price) {
      showToast("Name, price, and image are required", "error");
      return;
    }

    const priceNum = Number(form.price);
    const nextSort =
      editing?.sortOrder ??
      items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      price: priceNum,
      displayPrice: form.displayPrice.trim() || `RM ${priceNum}`,
      imageUrl: form.imageUrl,
      active: form.active,
      sortOrder: nextSort,
    };

    try {
      setSaving(true);
      if (editing) {
        await apiService.supplies.update(editing._id, payload);
        showToast("Supply updated");
      } else {
        await apiService.supplies.create(payload);
        showToast("Supply added");
      }
      clearSuppliesCache();
      setIsModalOpen(false);
      await load();
    } catch (err) {
      console.error(err);
      showToast("Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    if (usingFallback) {
      setDeleteId(null);
      showToast("Run migration before deleting.", "error");
      return;
    }
    try {
      await apiService.supplies.delete(deleteId);
      clearSuppliesCache();
      showToast("Supply deleted");
      setDeleteId(null);
      await load();
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "error");
    }
  };

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const nameMatch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      const categoryMatch =
        filterCategory === "all" || item.category === filterCategory;
      const statusMatch =
        filterStatus === "all" ||
        (filterStatus === "active" && item.active) ||
        (filterStatus === "hidden" && !item.active);
      return nameMatch && categoryMatch && statusMatch;
    });
  }, [items, searchTerm, filterCategory, filterStatus]);

  const displayItems = editMode ? draftItems : filteredItems;

  const startEditMode = () => {
    if (usingFallback) {
      showToast("Run migration before editing.", "error");
      return;
    }
    // Keep current category / status / search — edit only the filtered set.
    const ordered = [...filteredItems].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    draftItemsRef.current = ordered;
    setDraftItems(ordered);
    setSelectedIds([]);
    setMoveMenuOpen(false);
    setStatusMenuOpen(false);
    setBatchDeleteOpen(false);
    setEditMode(true);
    dragGhostRef.current = null;
    setDraggingId(null);
    setDragSize(null);
  };

  const cancelEditMode = () => {
    stopAutoScroll();
    clearRowTransforms();
    setEditMode(false);
    setDraftItems([]);
    setSelectedIds([]);
    setMoveMenuOpen(false);
    setStatusMenuOpen(false);
    setBatchDeleteOpen(false);
    dragGhostRef.current = null;
    setDraggingId(null);
    setDragSize(null);
  };

  const finishEditMode = async () => {
    if (savingOrder) return;

    // Merge reordered subset back into full catalogue slots (other categories stay put).
    const fullOrdered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const draftIdSet = new Set(draftItems.map((item) => item._id));
    const queue = [...draftItems];
    const merged = fullOrdered.map((item) =>
      draftIdSet.has(item._id) ? queue.shift()! : item,
    );
    if (queue.length) merged.push(...queue);

    const withOrders = merged.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
    }));
    const unchanged =
      withOrders.length === fullOrdered.length &&
      withOrders.every((item, index) => item._id === fullOrdered[index]?._id);

    if (unchanged) {
      cancelEditMode();
      return;
    }

    try {
      setSavingOrder(true);
      await apiService.supplies.updateSortOrders(
        withOrders.map((item) => ({ id: item._id, sortOrder: item.sortOrder })),
      );
      setItems(withOrders);
      clearSuppliesCache();
      showToast("Changes saved — Supplies page updated");
      stopAutoScroll();
      clearRowTransforms();
      setEditMode(false);
      setDraftItems([]);
      setSelectedIds([]);
      setMoveMenuOpen(false);
      setStatusMenuOpen(false);
      dragGhostRef.current = null;
      setDraggingId(null);
      setDragSize(null);
    } catch (err) {
      console.error(err);
      showToast("Save failed", "error");
    } finally {
      setSavingOrder(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const allSelected =
    draftItems.length > 0 && selectedIds.length === draftItems.length;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(draftItems.map((item) => item._id));
  };

  const confirmBatchDelete = async () => {
    if (!selectedIds.length || batchBusy) return;
    try {
      setBatchBusy(true);
      await Promise.all(
        selectedIds.map((id) => apiService.supplies.delete(id)),
      );
      const remaining = draftItems.filter(
        (item) => !selectedIds.includes(item._id),
      );
      draftItemsRef.current = remaining;
      setDraftItems(remaining);
      setItems((prev) =>
        prev.filter((item) => !selectedIds.includes(item._id)),
      );
      setSelectedIds([]);
      setBatchDeleteOpen(false);
      clearSuppliesCache();
      showToast(
        selectedIds.length === 1
          ? "1 supply deleted"
          : `${selectedIds.length} supplies deleted`,
      );
    } catch (err) {
      console.error(err);
      showToast("Batch delete failed", "error");
    } finally {
      setBatchBusy(false);
    }
  };

  const batchMoveToCategory = async (category: SupplyCategory) => {
    if (!selectedIds.length || batchBusy) return;
    try {
      setBatchBusy(true);
      setMoveMenuOpen(false);
      setStatusMenuOpen(false);
      await Promise.all(
        selectedIds.map((id) => apiService.supplies.update(id, { category })),
      );
      const patch = (list: PetSupply[]) =>
        list.map((item) =>
          selectedIds.includes(item._id) ? { ...item, category } : item,
        );
      const nextDraft = patch(draftItems);
      draftItemsRef.current = nextDraft;
      setDraftItems(nextDraft);
      setItems((prev) => patch(prev));
      clearSuppliesCache();
      showToast(
        `Moved ${selectedIds.length} to ${SUPPLY_CATEGORY_LABELS[category]}`,
      );
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      showToast("Move category failed", "error");
    } finally {
      setBatchBusy(false);
    }
  };

  const batchSetActive = async (active: boolean) => {
    if (!selectedIds.length || batchBusy) return;
    try {
      setBatchBusy(true);
      setMoveMenuOpen(false);
      setStatusMenuOpen(false);
      await Promise.all(
        selectedIds.map((id) => apiService.supplies.update(id, { active })),
      );
      const patch = (list: PetSupply[]) =>
        list.map((item) =>
          selectedIds.includes(item._id) ? { ...item, active } : item,
        );
      const nextDraft = patch(draftItems);
      draftItemsRef.current = nextDraft;
      setDraftItems(nextDraft);
      setItems((prev) => patch(prev));
      clearSuppliesCache();
      showToast(
        active
          ? `Set ${selectedIds.length} Active`
          : `Hid ${selectedIds.length} from Supplies page`,
      );
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      showToast("Update status failed", "error");
    } finally {
      setBatchBusy(false);
    }
  };

  const moveToTop = (index: number) => {
    if (!editMode || index <= 0 || savingOrder || dragGhostRef.current) return;
    setDraftItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.unshift(moved);
      draftItemsRef.current = next;
      return next;
    });
  };

  const paintGhost = (x: number, y: number) => {
    const node = ghostElRef.current;
    if (!node) return;
    node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.03)`;
  };

  const clearRowTransforms = () => {
    rowElsRef.current.forEach((el) => {
      el.style.transition = "";
      el.style.transform = "";
    });
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current !== null) {
      window.cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  };

  const findScrollParent = (el: HTMLElement): HTMLElement | Window => {
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== document.body) {
      const { overflowY } = window.getComputedStyle(node);
      if (
        (overflowY === "auto" ||
          overflowY === "scroll" ||
          overflowY === "overlay") &&
        node.scrollHeight > node.clientHeight + 1
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return window;
  };

  /** Convert viewport clientY into the same space as rowTopsRef (scroll-stable). */
  const clientYToContentY = (clientY: number) => {
    const sp = scrollParentRef.current;
    if (sp === window) return clientY + window.scrollY;
    const box = (sp as HTMLElement).getBoundingClientRect();
    return clientY - box.top + (sp as HTMLElement).scrollTop;
  };

  const measureRowContentTops = () => {
    const sp = scrollParentRef.current;
    rowTopsRef.current = draftItemsRef.current.map((entry) => {
      const el = rowElsRef.current.get(entry._id);
      if (!el) return 0;
      const top = el.getBoundingClientRect().top;
      if (sp === window) return top + window.scrollY;
      const box = (sp as HTMLElement).getBoundingClientRect();
      return top - box.top + (sp as HTMLElement).scrollTop;
    });
  };

  /** Shift other rows with GPU transforms — no React re-render while dragging. */
  const paintRowShifts = (
    fromIndex: number,
    overIndex: number,
    height: number,
  ) => {
    const list = draftItemsRef.current;
    list.forEach((item, index) => {
      const el = rowElsRef.current.get(item._id);
      if (!el) return;
      if (index === fromIndex) {
        el.style.transition = "none";
        el.style.transform = "";
        return;
      }
      let dy = 0;
      if (fromIndex < overIndex && index > fromIndex && index <= overIndex)
        dy = -height;
      else if (fromIndex > overIndex && index < fromIndex && index >= overIndex)
        dy = height;
      el.style.transition = "transform 140ms ease";
      el.style.transform = dy ? `translate3d(0, ${dy}px, 0)` : "";
    });
  };

  const getOverIndex = (clientY: number) => {
    const tops = rowTopsRef.current;
    if (!tops.length) return 0;
    const y = clientYToContentY(clientY);
    const height = dragGhostRef.current?.height ?? 56;
    for (let i = 0; i < tops.length; i += 1) {
      const bottom = i < tops.length - 1 ? tops[i + 1] : tops[i] + height;
      const mid = (tops[i] + bottom) / 2;
      if (y < mid) return i;
    }
    return tops.length - 1;
  };

  const syncOverIndexFromPointer = (clientY: number) => {
    const prev = dragGhostRef.current;
    if (!prev) return;
    const overIndex = getOverIndex(clientY);
    if (overIndex === prev.overIndex) return;
    prev.overIndex = overIndex;
    paintRowShifts(prev.fromIndex, overIndex, prev.height);
  };

  const tickAutoScroll = () => {
    autoScrollRef.current = null;
    const prev = dragGhostRef.current;
    if (!prev) return;

    const clientY = lastPointerYRef.current;
    const sp = scrollParentRef.current;
    const edge = 56;
    const step = 14;
    let scrolled = false;

    if (sp === window) {
      if (clientY < edge) {
        window.scrollBy(0, -step);
        scrolled = true;
      } else if (clientY > window.innerHeight - edge) {
        window.scrollBy(0, step);
        scrolled = true;
      }
    } else {
      const box = (sp as HTMLElement).getBoundingClientRect();
      if (clientY < box.top + edge) {
        (sp as HTMLElement).scrollTop -= step;
        scrolled = true;
      } else if (clientY > box.bottom - edge) {
        (sp as HTMLElement).scrollTop += step;
        scrolled = true;
      }
    }

    if (scrolled) {
      syncOverIndexFromPointer(clientY);
      autoScrollRef.current = window.requestAnimationFrame(tickAutoScroll);
    }
  };

  const onDragPointerDown = (event: React.PointerEvent, index: number) => {
    if (!editMode || savingOrder) return;
    const item = draftItemsRef.current[index] ?? draftItems[index];
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const row = (event.currentTarget as HTMLElement).closest(
      "[data-supply-id]",
    ) as HTMLElement | null;
    const rect = row?.getBoundingClientRect();
    if (!rect) return;
    clearRowTransforms();
    stopAutoScroll();
    scrollParentRef.current = listRef.current
      ? findScrollParent(listRef.current)
      : window;
    measureRowContentTops();
    lastPointerYRef.current = event.clientY;
    const nextGhost: DragGhost = {
      id: item._id,
      fromIndex: index,
      overIndex: index,
      width: rect.width,
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    dragGhostRef.current = nextGhost;
    setDragSize({ width: rect.width, height: rect.height });
    setDraggingId(item._id);
    requestAnimationFrame(() => paintGhost(rect.left, rect.top));
  };

  const onDragPointerMove = (event: React.PointerEvent) => {
    const prev = dragGhostRef.current;
    if (!prev || !editMode) return;

    lastPointerYRef.current = event.clientY;
    paintGhost(event.clientX - prev.offsetX, event.clientY - prev.offsetY);
    syncOverIndexFromPointer(event.clientY);

    const sp = scrollParentRef.current;
    const edge = 56;
    let nearEdge = false;
    if (sp === window) {
      nearEdge =
        event.clientY < edge || event.clientY > window.innerHeight - edge;
    } else {
      const box = (sp as HTMLElement).getBoundingClientRect();
      nearEdge =
        event.clientY < box.top + edge || event.clientY > box.bottom - edge;
    }
    if (nearEdge && autoScrollRef.current === null) {
      autoScrollRef.current = window.requestAnimationFrame(tickAutoScroll);
    } else if (!nearEdge) {
      stopAutoScroll();
    }
  };

  const onDragPointerUp = (event: React.PointerEvent) => {
    const ghost = dragGhostRef.current;
    if (!ghost) return;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(
        event.pointerId,
      );
    } catch {
      /* already released */
    }

    stopAutoScroll();
    const { fromIndex, overIndex } = ghost;
    clearRowTransforms();
    dragGhostRef.current = null;
    setDraggingId(null);
    setDragSize(null);

    if (fromIndex === overIndex) return;
    setDraftItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(overIndex, 0, moved);
      draftItemsRef.current = next;
      return next;
    });
  };

  const draggedItem = draggingId
    ? (draftItems.find((item) => item._id === draggingId) ?? null)
    : null;

  return (
    <div className="space-y-3 py-4 sm:space-y-6 sm:py-6">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete this supply?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
      <ConfirmDialog
        open={batchDeleteOpen}
        title={`Delete ${selectedIds.length} selected?`}
        message="This cannot be undone."
        confirmLabel={batchBusy ? "Deleting…" : "Delete"}
        onConfirm={confirmBatchDelete}
        onCancel={() => {
          if (!batchBusy) setBatchDeleteOpen(false);
        }}
      />

      {editMode ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={cancelEditMode}
              disabled={savingOrder || batchBusy || Boolean(draggingId)}
              className="min-w-[3.25rem] text-left text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <h2 className="text-lg font-bold text-gray-900">Edit</h2>
            <button
              type="button"
              onClick={finishEditMode}
              disabled={savingOrder || batchBusy || Boolean(draggingId)}
              className="min-w-[3.25rem] text-right text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {savingOrder ? "…" : "Done"}
            </button>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-100/80 px-2.5 py-1.5">
              <p className="text-xs font-medium tabular-nums text-gray-500">
                {selectedIds.length} selected
              </p>
              <div className="flex items-center gap-0.5">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusMenuOpen(false);
                      setMoveMenuOpen((open) => !open);
                    }}
                    disabled={batchBusy || Boolean(draggingId)}
                    className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50"
                  >
                    Move to
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  {moveMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      {MOVE_CATEGORY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => batchMoveToCategory(opt.value)}
                          className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-700"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setMoveMenuOpen(false);
                      setStatusMenuOpen((open) => !open);
                    }}
                    disabled={batchBusy || Boolean(draggingId)}
                    className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50"
                  >
                    Status
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  {statusMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => batchSetActive(true)}
                        className="block w-full px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => batchSetActive(false)}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Hidden
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setBatchDeleteOpen(true)}
                  disabled={batchBusy || Boolean(draggingId)}
                  className="rounded-md px-2 py-1 text-sm font-semibold text-red-600 hover:bg-white disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900">Pet Supplies</h2>
            <p className="text-sm text-gray-500">
              Manage food, treats, and toys shown on the Supplies page.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={startEditMode}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:px-4"
              aria-label="Add Supply"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Supply</span>
            </button>
          </div>
        </div>
      )}

      {usingFallback && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>
            Showing local preview data. Table may exist, but the app could not
            read it. Run{" "}
            <code className="font-mono">009_pet_supplies_grants.sql</code> in
            Supabase (grants + schema reload), then refresh this page.
          </p>
          {loadError && (
            <p className="mt-1.5 font-mono text-xs text-amber-700/90">
              Error: {loadError}
            </p>
          )}
        </div>
      )}

      {!editMode && (
        <div
          className="sticky z-30 -mx-4 space-y-1.5 border-b border-gray-200/80 bg-gray-50 px-4 py-2 sm:mx-0 sm:space-y-3 sm:px-0 sm:py-3"
          style={{ top: "var(--admin-chrome-h, 7.5rem)" }}
        >
          <div className="relative min-w-0 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 sm:left-3 sm:h-4 sm:w-4" />
            <input
              type="text"
              placeholder="Search supplies…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-xs text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 sm:rounded-lg sm:py-2 sm:pl-9 sm:pr-9 sm:text-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 sm:right-2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="-mx-0.5 min-w-0 flex-1 overflow-x-auto px-0.5 py-1 sm:mx-0 sm:px-0">
              <div className="flex gap-1.5">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterCategory(opt.value)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      filterCategory === opt.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {opt.label === "All Categories" ? "All" : opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="inline-flex w-full rounded-lg border border-gray-200 bg-white p-0.5 sm:w-auto">
                {(
                  [
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "hidden", label: "Hidden" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterStatus(opt.value)}
                    className={`min-w-0 flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:flex-none sm:px-3 ${
                      filterStatus === opt.value
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="hidden text-xs text-gray-400 sm:inline">
                {filteredItems.length}/{items.length}
              </span>
            </div>
          </div>

          {(searchTerm ||
            filterCategory !== "all" ||
            filterStatus !== "all") && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-700">
                  {filteredItems.length}
                </span>{" "}
                of {items.length}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("all");
                  setFilterStatus("all");
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      ) : displayItems.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          No supplies match your filters.
        </div>
      ) : editMode ? (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_3rem_3rem] items-center gap-1 border-b border-gray-100 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-400 sm:grid-cols-[2.25rem_minmax(0,1fr)_3.5rem_3.5rem] sm:px-4">
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <span>Item</span>
              <span className="text-center">Top</span>
              <span className="text-center">Sort</span>
            </div>
            <ul ref={listRef} className="relative">
              {displayItems.map((item, index) => {
                const isDragging = draggingId === item._id;
                const checked = selectedIds.includes(item._id);
                return (
                  <li
                    key={item._id}
                    data-supply-id={item._id}
                    ref={(el) => {
                      if (el) rowElsRef.current.set(item._id, el);
                      else rowElsRef.current.delete(item._id);
                    }}
                    className="relative border-b border-gray-100 last:border-b-0 will-change-transform"
                    style={
                      isDragging && dragSize
                        ? { height: dragSize.height }
                        : undefined
                    }
                  >
                    <div
                      className={`grid grid-cols-[2rem_minmax(0,1fr)_3rem_3rem] items-center gap-1 px-3 py-2.5 sm:grid-cols-[2.25rem_minmax(0,1fr)_3.5rem_3.5rem] sm:px-4 ${
                        isDragging
                          ? "opacity-0"
                          : checked
                            ? "bg-blue-50/60"
                            : "bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelect(item._id)}
                        aria-pressed={checked}
                        aria-label={`Select ${item.name}`}
                        className="col-span-2 flex min-w-0 items-center gap-1 text-left"
                      >
                        <span className="flex w-8 shrink-0 justify-center sm:w-9">
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            tabIndex={-1}
                            className="pointer-events-none h-4 w-4 rounded border-gray-300 text-blue-600"
                          />
                        </span>
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-gray-50">
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              draggable={false}
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-gray-900">
                              {item.name}
                            </span>
                            <span className="block truncate text-xs">
                              <span className="font-medium text-rose-500">
                                {SUPPLY_CATEGORY_LABELS[item.category]}
                              </span>
                              <span className="text-gray-500">
                                {" "}
                                · {item.displayPrice}
                              </span>
                            </span>
                          </span>
                        </span>
                      </button>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => moveToTop(index)}
                          disabled={
                            index === 0 || savingOrder || Boolean(draggingId)
                          }
                          aria-label={`Move ${item.name} to top`}
                          className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-25"
                        >
                          <ArrowUpToLine className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          aria-label={`Drag to sort ${item.name}`}
                          onPointerDown={(event) =>
                            onDragPointerDown(event, index)
                          }
                          onPointerMove={onDragPointerMove}
                          onPointerUp={onDragPointerUp}
                          onPointerCancel={onDragPointerUp}
                          className="cursor-grab touch-none rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing"
                        >
                          <Menu className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    {isDragging && (
                      <div className="pointer-events-none absolute inset-x-3 inset-y-1 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/60 sm:inset-x-4" />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {draggingId && draggedItem && dragSize && (
            <div
              ref={ghostElRef}
              className="pointer-events-none fixed left-0 top-0 z-[200] overflow-hidden rounded-xl border border-blue-200 bg-white shadow-2xl ring-1 ring-black/5 will-change-transform"
              style={{
                width: dragSize.width,
                height: dragSize.height,
                transform: "translate3d(-9999px, -9999px, 0)",
              }}
            >
              <div className="grid h-full grid-cols-[2rem_minmax(0,1fr)_3rem_3rem] items-center gap-1 px-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_3.5rem_3.5rem] sm:px-4">
                <div />
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-gray-50">
                    <img
                      src={draggedItem.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {draggedItem.name}
                    </p>
                    <p className="truncate text-xs">
                      <span className="font-medium text-rose-500">
                        {SUPPLY_CATEGORY_LABELS[draggedItem.category]}
                      </span>
                      <span className="text-gray-500">
                        {" "}
                        · {draggedItem.displayPrice}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex justify-center text-gray-300">
                  <ArrowUpToLine className="h-5 w-5" />
                </div>
                <div className="flex justify-center text-blue-500">
                  <Menu className="h-5 w-5" />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item) => (
            <div
              key={item._id}
              className="flex gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:gap-3"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50 sm:h-20 sm:w-20">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium uppercase tracking-wide text-rose-500">
                      {SUPPLY_CATEGORY_LABELS[item.category]}
                    </p>
                    <h3 className="truncate font-semibold text-gray-900">
                      {item.name}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      item.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.active ? "Active" : "Hidden"}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                  {item.description}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <p className="text-sm font-bold text-rose-600">
                    {item.displayPrice}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      aria-label="Edit"
                      className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(item._id)}
                      aria-label="Delete"
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editing ? "Edit Supply" : "Add Supply"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      category: e.target.value as SupplyCategory,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="dog-food">Dog Food</option>
                  <option value="cat-food">Cat Food</option>
                  <option value="treats">Treats & Snacks</option>
                  <option value="toys">Toys</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Price (number)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => {
                      const price = e.target.value;
                      setForm((p) => ({
                        ...p,
                        price,
                        displayPrice:
                          p.displayPrice || (price ? `RM ${price}` : ""),
                      }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Display price
                  </label>
                  <input
                    value={form.displayPrice}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, displayPrice: e.target.value }))
                    }
                    placeholder="RM 25"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Image
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5 hover:bg-gray-100">
                  {uploading ? (
                    <span className="text-sm text-gray-500">Uploading…</span>
                  ) : preview ? (
                    <>
                      <img
                        src={preview}
                        alt="Preview"
                        className="h-14 w-14 shrink-0 rounded-md object-cover"
                      />
                      <span className="text-sm text-gray-500">
                        Click to change
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        Click to upload
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImage}
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, active: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Show on Supplies page
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : editing ? "Save changes" : "Add supply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliesManager;
