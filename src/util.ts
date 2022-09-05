// A union type of possible socket method names to leave available from the native Socket.prototype
type SocketMethods = "send" | "receive" | "join" | "leave"

/**
 * This function is used to remove the given methods from the given socket_prototype
 * to make the relevant socket types have only their relevant methods.
 * @param socketPrototype
 * @param methods
 */
export function allowMethods(socketPrototype: any, methods: SocketMethods[]) {
  const toDelete = ["send", "receive", "join", "leave"] as SocketMethods[]
  for (const method of toDelete) {
    if (methods.includes(method)) {
      delete socketPrototype[method]
    }
  }
}
