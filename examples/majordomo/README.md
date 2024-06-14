# Majordomo broker

This is an example broker implementation that partially implements
[7/MDP](https://rfc.zeromq.org/spec:7/MDP/). Notably, the broker and workers do
not send or listen to heartbeats.

## Running this example

To run this example, install the example project depedencies and run the
majordomo example script with `yarn`:

```
> yarn install
> yarn majordomo
```

## Expected behaviour

The example will start a broker and some workers, then do some requests. The
output will be similar to this:

```
starting broker on tcp://127.0.0.1:5555
requesting 'oolong' from 'tea'
requesting 'sencha' from 'tea'
requesting 'earl grey, with milk' from 'tea'
requesting 'jasmine' from 'tea'
requesting 'cappuccino' from 'coffee'
requesting 'latte, with soy milk' from 'coffee'
requesting 'espresso' from 'coffee'
requesting 'irish coffee' from 'coffee'
registered worker 00800041af for 'coffee'
dispatching 'coffee' 00800041ab req -> 00800041af
registered worker 00800041b0 for 'tea'
dispatching 'tea' 00800041a7 req -> 00800041b0
registered worker 00800041b1 for 'tea'
dispatching 'tea' 00800041a8 req -> 00800041b1
dispatching 'tea' 00800041a7 <- rep 00800041b0
dispatching 'tea' 00800041a9 req -> 00800041b0
received 'oolong' from 'tea'
dispatching 'coffee' 00800041ab <- rep 00800041af
dispatching 'coffee' 00800041ac req -> 00800041af
received 'cappuccino' from 'coffee'
dispatching 'tea' 00800041a9 <- rep 00800041b0
dispatching 'tea' 00800041aa req -> 00800041b0
received 'earl grey, with milk' from 'tea'
dispatching 'tea' 00800041a8 <- rep 00800041b1
received 'sencha' from 'tea'
dispatching 'tea' 00800041aa <- rep 00800041b0
received 'jasmine' from 'tea'
dispatching 'coffee' 00800041ac <- rep 00800041af
dispatching 'coffee' 00800041ad req -> 00800041af
received 'latte, with soy milk' from 'coffee'
dispatching 'coffee' 00800041ad <- rep 00800041af
dispatching 'coffee' 00800041ae req -> 00800041af
received 'espresso' from 'coffee'
dispatching 'coffee' 00800041ae <- rep 00800041af
received 'irish coffee' from 'coffee'
timeout expired waiting for 'soda'
deregistered worker 00800041b1 for 'tea'
```
