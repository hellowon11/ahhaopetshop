import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { apiService } from "../services/apiService";
import { ShopPet } from "../types";
import { clearShopPetsCache } from "../utils/pageDataCache";
import { getImageUrl } from "../utils/imageUrl";
import ConfirmDialog from "./ConfirmDialog";
import Toast, { ToastState } from "./Toast";
import { GenderBadge } from "./GenderIcon";

type PetStatus = "Listed" | "Unlisted" | "Sold";

const EMPTY_FORM = {
  petId: "",
  name: "",
  breed: "",
  age: "",
  gender: "Male" as "Male" | "Female",
  imageUrl: "",
  type: "dog" as "dog" | "cat",
  description: "",
  status: "Listed" as PetStatus,
};

const errMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: string }).message || "Request failed");
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
};

const PetListingsManager: React.FC = () => {
  const [pets, setPets] = useState<ShopPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "dog" | "cat">("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "listed" | "unlisted" | "sold"
  >("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShopPet | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShopPet | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const petsPerPage = 10;

  const showToast = useCallback(
    (message: string, type: ToastState["type"] = "success") => {
      setToast({ message, type });
    },
    [],
  );

  const stats = useMemo(() => {
    let listed = 0;
    let unlisted = 0;
    let sold = 0;
    for (const pet of pets) {
      const status = pet.status || "Listed";
      if (status === "Sold") sold += 1;
      else if (status === "Unlisted") unlisted += 1;
      else listed += 1;
    }
    return { listed, unlisted, sold };
  }, [pets]);

  const generateNextPetId = useCallback(
    (type: "dog" | "cat", list: ShopPet[] = pets): string => {
      const prefix = type === "dog" ? "D" : "C";
      const numbers = list
        .filter((pet) => pet.type === type)
        .map((pet) => {
          const match = pet.petId.match(/(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        });
      const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
      return `${prefix}${String(next).padStart(3, "0")}`;
    },
    [pets],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await apiService.shopPets.getAll("all")) as ShopPet[];
      setPets(data);
    } catch (err) {
      console.error("Failed to fetch pets:", err);
      showToast(errMessage(err) || "Failed to load pets", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    const nextId = generateNextPetId("dog");
    setForm({ ...EMPTY_FORM, petId: nextId, type: "dog", status: "Listed" });
    setPreview(null);
    setIsModalOpen(true);
  };

  const openEdit = (pet: ShopPet) => {
    setEditing(pet);
    setForm({
      petId: pet.petId,
      name: pet.name,
      breed: pet.breed,
      age: pet.age,
      gender: pet.gender,
      imageUrl: pet.imageUrl,
      type: pet.type,
      description: pet.description || "",
      status: (pet.status || "Listed") as PetStatus,
    });
    setPreview(pet.imageUrl ? getImageUrl(pet.imageUrl) : null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setPreview(null);
  };

  const patchForm = (partial: Partial<typeof EMPTY_FORM>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const handleTypeChange = (type: "dog" | "cat") => {
    if (editing) {
      // Keep existing petId when editing — type change would break ID prefix identity
      patchForm({ type });
      return;
    }
    patchForm({ type, petId: generateNextPetId(type) });
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      showToast("Only JPEG, PNG, or WebP images are allowed", "error");
      return;
    }
    try {
      setUploading(true);
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      const imageUrl = await apiService.shopPets.uploadImage(file);
      patchForm({ imageUrl });
      setPreview(imageUrl);
      showToast("Image uploaded");
    } catch (err) {
      console.error(err);
      showToast(errMessage(err) || "Image upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.name.trim() ||
      !form.breed.trim() ||
      !form.age.trim() ||
      !form.imageUrl
    ) {
      showToast("Name, breed, age, and image are required", "error");
      return;
    }

    const payload = {
      petId: form.petId,
      name: form.name.trim(),
      breed: form.breed.trim(),
      age: form.age.trim(),
      gender: form.gender,
      imageUrl: form.imageUrl,
      type: form.type,
      description: form.description.trim(),
      status: form.status,
    };

    try {
      setSaving(true);
      if (editing) {
        await apiService.shopPets.update(editing.petId, {
          name: payload.name,
          breed: payload.breed,
          age: payload.age,
          gender: payload.gender,
          imageUrl: payload.imageUrl,
          type: payload.type,
          description: payload.description,
          status: payload.status,
        });
        showToast("Pet updated");
      } else {
        await apiService.shopPets.create(payload);
        showToast("Pet added");
      }
      clearShopPetsCache();
      closeModal();
      await load();
    } catch (err) {
      console.error(err);
      showToast(errMessage(err) || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (pet: ShopPet, status: PetStatus) => {
    if ((pet.status || "Listed") === status) return;
    try {
      setStatusUpdatingId(pet.petId);
      await apiService.shopPets.updateStatus(pet.petId, status);
      clearShopPetsCache();
      setPets((prev) =>
        prev.map((p) =>
          p.petId === pet.petId
            ? { ...p, status, isForSale: status === "Listed" }
            : p,
        ),
      );
      showToast(`Marked as ${status}`);
    } catch (err) {
      console.error(err);
      showToast(errMessage(err) || "Failed to update status", "error");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await apiService.shopPets.delete(target.petId);
      clearShopPetsCache();
      showToast("Pet deleted");
      await load();
    } catch (err) {
      console.error(err);
      showToast(errMessage(err) || "Delete failed", "error");
    }
  };

  const filteredPets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return pets.filter((pet) => {
      const searchMatch =
        !q ||
        pet.name.toLowerCase().includes(q) ||
        pet.breed.toLowerCase().includes(q) ||
        pet.petId.toLowerCase().includes(q);
      const typeMatch = filterType === "all" || pet.type === filterType;
      const status = pet.status || "Listed";
      const statusMatch =
        filterStatus === "all" ||
        (filterStatus === "listed" && status === "Listed") ||
        (filterStatus === "unlisted" && status === "Unlisted") ||
        (filterStatus === "sold" && status === "Sold");
      return searchMatch && typeMatch && statusMatch;
    });
  }, [pets, searchTerm, filterType, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredPets.length / petsPerPage));
  const paginatedPets = useMemo(() => {
    const start = (currentPage - 1) * petsPerPage;
    return filteredPets.slice(start, start + petsPerPage);
  }, [filteredPets, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const statusSelectClass = (status: PetStatus) => {
    if (status === "Listed")
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    if (status === "Unlisted")
      return "border-rose-200 bg-rose-50 text-rose-800";
    return "border-amber-200 bg-amber-50 text-amber-900";
  };

  const StatusControl = ({ pet }: { pet: ShopPet }) => {
    const status = (pet.status || "Listed") as PetStatus;
    const busy = statusUpdatingId === pet.petId;
    return (
      <div className="inline-flex items-center gap-1.5">
        {status === "Listed" ? (
          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
        ) : status === "Unlisted" ? (
          <XCircle className="h-3.5 w-3.5 text-rose-600" />
        ) : null}
        <select
          value={status}
          disabled={busy}
          onChange={(e) => handleStatusChange(pet, e.target.value as PetStatus)}
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-blue-100 disabled:opacity-60 ${statusSelectClass(status)}`}
          aria-label={`Status for ${pet.name}`}
        >
          <option value="Listed">Listed</option>
          <option value="Unlisted">Unlisted</option>
          <option value="Sold">Sold</option>
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-3 py-4 sm:space-y-6 sm:py-6">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this pet?"
        message={
          deleteTarget
            ? `${deleteTarget.name} (${deleteTarget.petId}) will be permanently removed.`
            : "This cannot be undone."
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900">Pet Listings</h2>
          <p className="text-sm text-gray-500">
            Add and edit pets for the shop. Mark each as Listed, Unlisted, or
            Sold.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:px-4"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add New Pet</span>
        </button>
      </div>

      <div
        className="sticky z-30 -mx-4 space-y-1.5 border-b border-gray-200/80 bg-gray-50 px-4 py-2 md:mx-0 md:space-y-2.5 md:px-0 md:py-3"
        style={{ top: "var(--admin-chrome-h, 7.5rem)" }}
      >
        <div className="flex flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center md:gap-3">
          <div className="relative w-full min-w-0 md:min-w-[12rem] md:max-w-xs md:flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 md:left-3 md:h-4 md:w-4" />
            <input
              type="text"
              placeholder="Search name, breed, or ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-xs outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 md:rounded-lg md:py-2 md:pl-9 md:pr-9 md:text-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 md:right-2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="-mx-0.5 grid grid-cols-3 gap-1.5 px-0.5 py-1 md:mx-0 md:flex md:shrink-0 md:gap-1.5 md:px-0 md:py-0">
            {(
              [
                { value: "all", label: "All" },
                { value: "dog", label: "Dogs" },
                { value: "cat", label: "Cats" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilterType(opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition max-md:w-full ${
                  filterType === opt.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="md:ml-auto">
            <div className="grid w-full grid-cols-4 gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5 md:inline-flex md:w-auto md:gap-0">
              {(
                [
                  {
                    value: "all",
                    label: "All",
                    mobile: "All",
                    count: pets.length,
                  },
                  {
                    value: "listed",
                    label: `Listed (${stats.listed})`,
                    mobile: "Listed",
                    count: stats.listed,
                  },
                  {
                    value: "unlisted",
                    label: `Unlisted (${stats.unlisted})`,
                    mobile: "Unlisted",
                    count: stats.unlisted,
                  },
                  {
                    value: "sold",
                    label: `Sold (${stats.sold})`,
                    mobile: "Sold",
                    count: stats.sold,
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilterStatus(opt.value)}
                  className={`min-w-0 rounded-md px-1 py-1 text-[11px] font-medium leading-tight transition md:px-3 md:py-1.5 md:text-xs md:leading-normal ${
                    filterStatus === opt.value
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <span className="md:hidden">
                    <span className="block">{opt.mobile}</span>
                    <span className="block text-[10px] font-semibold tabular-nums leading-none opacity-80">
                      {opt.count}
                    </span>
                  </span>
                  <span className="hidden md:inline">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {(searchTerm || filterType !== "all" || filterStatus !== "all") && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700">
                {filteredPets.length}
              </span>{" "}
              of {pets.length}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setFilterType("all");
                setFilterStatus("all");
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 hidden flex-wrap gap-4 md:flex">
        <div className="flex items-center">
          <div className="mr-2 h-3 w-3 rounded-full bg-emerald-400" />
          <span className="text-sm text-gray-600">Listed: {stats.listed}</span>
        </div>
        <div className="flex items-center">
          <div className="mr-2 h-3 w-3 rounded-full bg-rose-400" />
          <span className="text-sm text-gray-600">
            Unlisted: {stats.unlisted}
          </span>
        </div>
        <div className="flex items-center">
          <div className="mr-2 h-3 w-3 rounded-full bg-amber-400" />
          <span className="text-sm text-gray-600">Sold: {stats.sold}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 shadow-sm md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Basic Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedPets.length > 0 ? (
                  paginatedPets.map((pet) => (
                    <tr
                      key={pet._id || pet.petId}
                      className={pet.status === "Sold" ? "bg-amber-50/60" : ""}
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {pet.petId}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-16 w-16 overflow-hidden rounded-md bg-gray-100">
                          <img
                            src={getImageUrl(pet.imageUrl)}
                            alt={pet.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/default-pet-image.png";
                            }}
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            {pet.name}
                            <GenderBadge gender={pet.gender} />
                          </span>
                          <span className="text-sm text-gray-500">
                            {pet.breed}
                          </span>
                          <div className="mt-1 flex items-center space-x-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                pet.type === "dog"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {pet.type === "dog" ? "Dog" : "Cat"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {pet.age}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusControl pet={pet} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={() => openEdit(pet)}
                            className="text-blue-600 hover:text-blue-900"
                            aria-label={`Edit ${pet.name}`}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(pet)}
                            className="text-red-600 hover:text-red-900"
                            aria-label={`Delete ${pet.name}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No pets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {paginatedPets.length > 0 ? (
              paginatedPets.map((pet) => (
                <div
                  key={pet._id || pet.petId}
                  className={`rounded-lg border bg-white shadow-sm ${
                    pet.status === "Sold"
                      ? "border-amber-200 bg-amber-50/60"
                      : "border-gray-200"
                  }`}
                >
                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-gray-500">
                        {pet.petId}
                      </span>
                      <StatusControl pet={pet} />
                    </div>
                    <div className="flex gap-4">
                      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        <img
                          src={getImageUrl(pet.imageUrl)}
                          alt={pet.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/default-pet-image.png";
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="inline-flex items-center gap-1.5 text-lg font-medium text-gray-900">
                          {pet.name}
                          <GenderBadge gender={pet.gender} />
                        </h3>
                        <p className="text-gray-600">{pet.breed}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              pet.type === "dog"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {pet.type === "dog" ? "Dog" : "Cat"}
                          </span>
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                            {pet.age}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-1 border-t pt-3">
                      <button
                        type="button"
                        onClick={() => openEdit(pet)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-900"
                        aria-label={`Edit ${pet.name}`}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(pet)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-900"
                        aria-label={`Delete ${pet.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-gray-500">
                No pets found
              </div>
            )}
          </div>
        </>
      )}

      {filteredPets.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing {(currentPage - 1) * petsPerPage + 1} to{" "}
            {Math.min(currentPage * petsPerPage, filteredPets.length)} of{" "}
            {filteredPets.length} pets
          </p>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`rounded p-2 ${
                currentPage === 1
                  ? "cursor-not-allowed text-gray-400"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage >= totalPages}
              className={`rounded p-2 ${
                currentPage >= totalPages
                  ? "cursor-not-allowed text-gray-400"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex overflow-auto bg-black/50 p-4">
          <div className="relative m-auto w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-3 top-3 rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              {editing ? "Edit Pet" : "Add New Pet"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pet ID
                  </label>
                  <input
                    type="text"
                    value={form.petId}
                    disabled
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {editing
                      ? "ID cannot be changed"
                      : "Auto-generated from type"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      handleTypeChange(e.target.value as "dog" | "cat")
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                    required
                  >
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => patchForm({ name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Breed
                </label>
                <input
                  type="text"
                  value={form.breed}
                  onChange={(e) => patchForm({ breed: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Age
                  </label>
                  <input
                    type="text"
                    value={form.age}
                    onChange={(e) => patchForm({ age: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                    placeholder="e.g. 2 months"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      patchForm({ gender: e.target.value as "Male" | "Female" })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pet Image
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 flex h-40 w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 transition hover:border-blue-500"
                >
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                      <span className="mt-2 text-sm text-gray-500">
                        Uploading…
                      </span>
                    </div>
                  ) : preview || form.imageUrl ? (
                    <img
                      src={preview || getImageUrl(form.imageUrl)}
                      alt="Preview"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImageIcon className="h-10 w-10 text-gray-400" />
                      <span className="mt-2 text-sm text-gray-500">
                        Click to upload
                      </span>
                      <span className="mt-1 text-xs text-gray-400">
                        JPEG, PNG, WebP
                      </span>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImage}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => patchForm({ description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Listing status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    patchForm({ status: e.target.value as PetStatus })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                  required
                >
                  <option value="Listed">Listed — visible & for sale</option>
                  <option value="Unlisted">Unlisted — hidden from shop</option>
                  <option value="Sold">Sold — kept for records</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Status also updates “for sale” for the public shop pages.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving || uploading || !form.imageUrl}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {saving ? "Saving…" : editing ? "Update" : "Save"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetListingsManager;
