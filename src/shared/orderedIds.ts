export function orderOwnedIds(ownedIds: string[], preferredOrder: string[]): string[] {
  const ownedIdSet = new Set(ownedIds)
  const seen = new Set<string>()
  const ordered = preferredOrder.filter((id) => {
    if (!ownedIdSet.has(id) || seen.has(id)) return false
    seen.add(id)
    return true
  })

  return [...ordered, ...ownedIds.filter((id) => !seen.has(id))]
}