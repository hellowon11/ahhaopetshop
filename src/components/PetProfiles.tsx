import React, { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/apiService";
import { Pet } from "../types";
import Toast, { ToastState } from "./Toast";
import ConfirmDialog from "./ConfirmDialog";

interface PetProfilesProps {
  isAddingPet: boolean;
  setIsAddingPet: (value: boolean) => void;
  onAddPet: (petData: Omit<Pet, "_id">) => Promise<void>;
  onUpdatePet: (id: string, petData: Partial<Pet>) => Promise<void>;
  onDeletePet: (id: string) => Promise<void>;
  hideNavigationButtons?: boolean;
}

const isFemale = (gender?: string) =>
  (gender || "").toLowerCase().startsWith("f");
const isMale = (gender?: string) =>
  (gender || "").toLowerCase().startsWith("m");

const formatAge = (age?: string | number) => {
  if (age === undefined || age === null || String(age).trim() === "")
    return null;
  const value = String(age).trim();
  if (/year|yr|month|mo|week|day|岁/i.test(value)) return value;
  // bare number → assume years
  if (/^\d+(\.\d+)?$/.test(value))
    return `${value} yr${value === "1" ? "" : "s"}`;
  return value;
};

/** Classic ♂ / ♀ marks as icons */
const GenderIcon: React.FC<{ gender?: string; className?: string }> = ({
  gender,
  className = "h-3.5 w-3.5",
}) => {
  if (isFemale(gender)) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <circle
          cx="12"
          cy="9"
          r="5.25"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <path
          d="M12 14.25V21M9.5 18.25h5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (isMale(gender)) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <circle
          cx="10"
          cy="14"
          r="5.25"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <path
          d="M14.5 9.5L20 4M20 4h-5.25M20 4v5.25"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return null;
};

// 扩展 Pet 类型以包含额外的 UI 相关字段
interface PetWithUI extends Pet {
  imageUrl?: string;
  specialNeeds?: string;
}

const PetProfiles: React.FC<PetProfilesProps> = ({
  isAddingPet,
  setIsAddingPet,
  onAddPet,
  onUpdatePet,
  onDeletePet,
  hideNavigationButtons = false,
}) => {
  const { user } = useAuth();
  const [pets, setPets] = useState<PetWithUI[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingPet, setEditingPet] = useState<PetWithUI | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [petToDelete, setPetToDelete] = useState<string | null>(null);

  const showSuccessMessage = useCallback((message: string) => {
    setToast({ message, type: "success" });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (user && user._id) {
      loadPets();
    }
  }, [user?._id]);

  const loadPets = async () => {
    if (!user || !user._id) {
      console.error("Cannot load pets: User not authenticated");
      return;
    }

    try {
      setLoading(true);
      console.log("Loading pets for user:", user._id);
      const petsData = await apiService.pets.getAll();
      console.log("Pets loaded:", petsData.length);
      setPets(
        petsData.map((pet) => ({
          ...pet,
          imageUrl: pet.imageUrl || "/default-pet-image.png",
        })),
      );
    } catch (err) {
      console.error("Failed to load pets:", err);
      setError("Failed to load pets. Please refresh the page and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user || !user._id) {
      setError(
        "Authentication error. Please try logging out and logging in again.",
      );
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const breed = formData.get("breed") as string;
      const ageStr = formData.get("age") as string;
      const gender = formData.get("gender") as "male" | "female";
      const specialNeeds = formData.get("specialNeeds") as string;

      if (!name.trim()) {
        setError("Pet name is required");
        setLoading(false);
        return;
      }

      if (!gender || !["male", "female"].includes(gender)) {
        setError("Please select a valid gender");
        setLoading(false);
        return;
      }

      const age = ageStr.trim();
      const petPayload = {
        owner: user.id || user._id,
        name: name.trim(),
        breed: breed.trim() || "",
        age,
        gender,
        specialNeeds: specialNeeds.trim() || "",
        imageUrl: selectedImage || "",
        type: breed.trim() || "Other",
        updatedAt: new Date(),
      };

      if (editingPet?._id) {
        await onUpdatePet(editingPet._id, petPayload);
        showSuccessMessage("Pet updated successfully");
      } else {
        await onAddPet({
          ...petPayload,
          createdAt: new Date(),
        });
        showSuccessMessage("Pet added successfully");
      }

      await loadPets();
      setIsAddingPet(false);
      setSelectedImage(null);
      setEditingPet(null);
      setError(null);
    } catch (err: any) {
      console.error("Error saving pet:", err);
      setError(
        err?.message ||
          (editingPet
            ? "Failed to update pet. Please try again."
            : "Failed to add pet. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.match("image.*")) {
        setError("Please select a valid image file (JPG, PNG, etc.)");
        return;
      }

      try {
        // Create an image element to load the file
        const img = new Image();
        const reader = new FileReader();

        reader.onload = () => {
          img.src = reader.result as string;
        };

        img.onload = () => {
          // Create a canvas to compress the image
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          const maxSize = 800;
          if (width > height && width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          } else if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress the image
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to base64 with reduced quality
          const compressedImage = canvas.toDataURL("image/jpeg", 0.6);
          console.log(
            "Compressed image size:",
            Math.round(compressedImage.length / 1024),
            "KB",
          );

          setSelectedImage(compressedImage);
        };

        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Error processing image:", err);
        setError(
          "Error processing image. Please try again with a different image.",
        );
      }
    }
  };

  const handleDeletePet = (id: string) => {
    if (!user?._id) return;
    setPetToDelete(id);
  };

  const confirmDeletePet = async () => {
    if (!petToDelete) return;
    const id = petToDelete;
    setPetToDelete(null);

    try {
      setLoading(true);
      await onDeletePet(id);
      await loadPets();
      showSuccessMessage("Pet deleted successfully");
    } catch (err) {
      setError("Couldn’t delete this pet. Please try again.");
      console.error("Error deleting pet:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPet = (pet: PetWithUI) => {
    setEditingPet(pet);
    setSelectedImage(pet.imageUrl || null);
    setIsAddingPet(true);
  };

  return (
    <div className="space-y-3">
      <Toast toast={toast} onClose={clearToast} />
      <ConfirmDialog
        open={Boolean(petToDelete)}
        title="Delete this pet?"
        message="This will permanently remove the pet profile. You can’t undo this action."
        confirmLabel="Delete pet"
        cancelLabel="Keep pet"
        onConfirm={confirmDeletePet}
        onCancel={() => setPetToDelete(null)}
      />

      {error && (
        <div className="relative rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="absolute right-2 top-2 text-rose-500 hover:text-rose-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Horizontal cards: big photo + always-visible text beside it */}
      {loading ? (
        <div className="py-8 text-center text-sm text-stone-400">
          Loading pets…
        </div>
      ) : pets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
          No pets yet. Tap “Add New Pet” to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pets.map((pet) => {
            const ageLabel = formatAge(pet.age);
            const breedLabel = pet.breed || pet.type || "Mixed";
            const female = isFemale(pet.gender);
            const male = isMale(pet.gender);

            return (
              <article
                key={pet._id}
                className="group flex overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.28)] ring-1 ring-stone-200/80"
              >
                {/* Large square photo */}
                <div className="relative h-[7.75rem] w-[7.75rem] shrink-0 overflow-hidden sm:h-36 sm:w-36">
                  <img
                    src={pet.imageUrl || "/default-pet-image.png"}
                    alt={pet.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/default-pet-image.png";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
                </div>

                {/* All key info — always fully visible */}
                <div className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-3 sm:px-4 sm:py-3.5">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-lg font-semibold tracking-tight text-stone-900 sm:text-xl">
                      {pet.name}
                    </h3>
                    {(male || female) && (
                      <span
                        className={`inline-flex shrink-0 items-center justify-center ${
                          female ? "text-rose-500" : "text-sky-500"
                        }`}
                        title={female ? "Female" : "Male"}
                        aria-label={female ? "Female" : "Male"}
                      >
                        <GenderIcon gender={pet.gender} className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-stone-500">
                    {breedLabel}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-800">
                    {ageLabel ?? "Age not set"}
                  </p>
                </div>

                {/* Actions — top-right of the card */}
                <div className="flex shrink-0 items-center gap-0.5 self-start pt-2 pr-2 sm:pt-2.5 sm:pr-2.5">
                  <button
                    type="button"
                    onClick={() => handleEditPet(pet)}
                    aria-label="Edit pet"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition hover:bg-sky-50 hover:text-sky-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePet(pet._id)}
                    aria-label="Delete pet"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add/Edit Pet Modal */}
      {isAddingPet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">
              {editingPet ? "Edit Pet" : "Add New Pet"}
            </h3>
            <form
              onSubmit={handleSubmitPet}
              className="space-y-4"
              encType="multipart/form-data"
            >
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Pet Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/gif, image/webp"
                  onChange={handleImageChange}
                  className="w-full"
                />
                {selectedImage && (
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <input
                  name="name"
                  type="text"
                  placeholder="Pet Name *"
                  defaultValue={editingPet?.name}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <input
                  name="breed"
                  type="text"
                  placeholder="Breed (Optional)"
                  defaultValue={editingPet?.breed}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <input
                  name="age"
                  type="text"
                  placeholder="Age (Optional)"
                  defaultValue={editingPet?.age}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <select
                  name="gender"
                  className="w-full p-2 border rounded-md"
                  defaultValue={editingPet?.gender || ""}
                  required
                >
                  <option value="">Select Gender *</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <textarea
                  name="specialNeeds"
                  placeholder="Special Needs (Optional)"
                  defaultValue={editingPet?.specialNeeds}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPet(false);
                    setEditingPet(null);
                    setSelectedImage(null);
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-sm text-white rounded ${
                    loading
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  {loading ? "Saving…" : editingPet ? "Save" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetProfiles;
