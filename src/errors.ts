/**
 * @internal
 */
export interface FullError extends Error {
  code?: string
  errno?: number
  address?: string
}

/**
 * @internal
 */
export function isFullError(err: unknown): err is FullError {
  return err instanceof Error
}
