export function toBool(value: string | undefined): boolean | undefined {
  switch (value) {
    case "true":
    case "1":
      return true
    case "false":
    case "0":
      return false
    case undefined:
    case "":
      return undefined
    default:
      throw new Error(`Invalid boolean value: ${value}`)
  }
}

export function toString(value: string | undefined): string | undefined {
  switch (value) {
    case undefined:
    case "":
      return undefined
    default:
      return value
  }
}
