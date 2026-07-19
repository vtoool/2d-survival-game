export interface Profile {
  name: string
}

const KEY = 'joc.profile'

export function getStoredProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Profile) : null
  } catch {
    return null
  }
}

export function setStoredProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

export function clearStoredProfile(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
