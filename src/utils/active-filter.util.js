export function canSeeInactive(user) {
  return user?.role === 'admin'
}

export function applyActiveFilter(filter, isActive, user) {
  if (isActive && canSeeInactive(user)) {
    if (isActive === 'all') {
      return { ...filter }
    }
    return { ...filter, isActive: isActive === 'true' }
  }
  return { ...filter, isActive: true }
}
