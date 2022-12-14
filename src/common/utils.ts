import { toast } from 'react-hot-toast'

import { NEXT_PUBLIC_BACKEND_URL } from './constants'

// eslint-disable-next-line no-undef
export async function fetchWithJWT(input: RequestInfo | URL, init?: RequestInit) {
  const jwt = sessionStorage.getItem('jwt') ?? localStorage.getItem('jwt')

  if (jwt) {
    const Authorization = `Bearer ${jwt}`
    if (!init) init = { headers: { Authorization } }
    else if (!init.headers) init.headers = { Authorization }
    else (init.headers as Record<string, string>).Authorization = Authorization
  }

  return fetchThrowingError(input, init)
}

// eslint-disable-next-line no-undef
export async function fetchThrowingError(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(`${NEXT_PUBLIC_BACKEND_URL}${input}`, init)
  const result = await response.json()
  if (!response.ok) throw new Error(result.message)
  return result
}

export function toastError(error: Error) {
  toast.error(error.message)
}

export const formatKoreaPrice = new Intl.NumberFormat('ko-KR').format
