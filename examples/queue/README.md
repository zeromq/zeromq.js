# Simple send queue

This example implements a simple outgoing queue that will queue messages before sending them. If sending is possible, messages from the queue will be forwarded to the socket. If sending is not possible because the socket blocks, queueing will continue until the queue is full.

This example can serve as the basis for a queue that can be used in a broker to temporarily queue messages while there are no worker processes available, for example.

## Running this example

To run this example, install the example project depedencies and run the majordomo example script with `yarn`:

```
> yarn install
> yarn queue
```

## Expected behaviour

The example will start a queue, send messages onto it, and only afterwards connect a worker socket. The output will be similar to this:

```
received: hello
received: world!
received: <empty message>
```
