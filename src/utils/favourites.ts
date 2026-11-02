/** Build a map of shop petId -> true from favourites API rows. */
export function favouritesToPetIdMap(
  favouritesData: any[],
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const item of favouritesData || []) {
    const key =
      (typeof item.petId === "string" && item.petId) ||
      item.pet?.petId ||
      item.pet?._id ||
      null;
    if (key) map[key] = true;
  }
  return map;
}
