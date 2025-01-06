# Majordomo broker

This is an example broker implementation that partially implements
[7/MDP](https://rfc.zeromq.org/spec:7/MDP/). Notably, the broker and workers do
not send or listen to heartbeats.

## Running this example

To run this example, install the example project dependencies and run the
majordomo example script with `pnpm`:

```
> pnpm install
> pnpm run majordomo
```

## Expected behaviour

The example will start a broker and some workers, then do some requests. The
output will be similar to this:

```

starting broker on tcp://127.0.0.1:5555
starting worker on tcp://127.0.0.1:5555
starting worker on tcp://127.0.0.1:5555
starting worker on tcp://127.0.0.1:5555
---------- Started -----------
requesting 'cola' from 'soda'
requesting 'oolong' from 'tea'
requesting 'sencha' from 'tea'
requesting 'earl grey, with milk' from 'tea'
requesting 'jasmine' from 'tea'
requesting 'cappuccino' from 'coffee'
requesting 'latte, with soy milk' from 'coffee'
requesting 'espresso' from 'coffee'
requesting 'irish coffee' from 'coffee'
registered worker 00800041a7 for 'tea'
registered worker 00800041a8 for 'coffee'
registered worker 00800041a9 for 'tea'
dispatching 'tea' 00800041ab req -> 00800041a7
dispatching 'tea' 00800041ac req -> 00800041a9
dispatching 'coffee' 00800041af req -> 00800041a8
dispatching 'tea' 00800041ac <- rep 00800041a9
dispatching 'tea' 00800041ad req -> 00800041a9
received 'sencha' from 'tea'
dispatching 'tea' 00800041ad <- rep 00800041a9
dispatching 'tea' 00800041ae req -> 00800041a9
received 'earl grey, with milk' from 'tea'
dispatching 'coffee' 00800041af <- rep 00800041a8
dispatching 'coffee' 00800041b0 req -> 00800041a8
received 'cappuccino' from 'coffee'
dispatching 'coffee' 00800041b0 <- rep 00800041a8
dispatching 'coffee' 00800041b1 req -> 00800041a8
received 'latte, with soy milk' from 'coffee'
dispatching 'coffee' 00800041b1 <- rep 00800041a8
dispatching 'coffee' 00800041b2 req -> 00800041a8
received 'espresso' from 'coffee'
dispatching 'tea' 00800041ae <- rep 00800041a9
received 'jasmine' from 'tea'
dispatching 'coffee' 00800041b2 <- rep 00800041a8
received 'irish coffee' from 'coffee'
dispatching 'tea' 00800041ab <- rep 00800041a7
received 'oolong' from 'tea'
timeout expired waiting for 'soda'
---------- Stopping -----------
```
