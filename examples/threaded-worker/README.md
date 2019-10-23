# Distributed processing with worker threads

## Running this example

To run this example, install the example project depedencies and run the threaded worker example script with `yarn`:

```
> yarn install
> yarn threaded-worker
```

## Expected behaviour

The example will start worker threads which each encodes a character with the caesar cipher 200 million + 1 times. The output will be similar to this:

```
starting 8 worker threads
---
sending input 'Hello world!'
received work 'H' at 0
received work ' ' at 5
received work 'w' at 6
received work 'o' at 4
received work 'e' at 1
received work 'o' at 7
received work 'l' at 3
received work 'l' at 2
finished work ' ' -> ' ' at 5
finished work 'o' -> 'b' at 7
finished work 'o' -> 'b' at 4
finished work 'w' -> 'j' at 6
finished work 'l' -> 'y' at 3
received work '!' at 11
finished work '!' -> '!' at 11
finished work 'l' -> 'y' at 2
received work 'd' at 10
finished work 'd' -> 'q' at 10
finished work 'H' -> 'U' at 0
received work 'r' at 8
finished work 'r' -> 'e' at 8
received output 'Hello world!' -> 'Uryyb jbeyq!' in 3s
---
sending input 'Would you like more sockets?'
received work 'u' at 2
received work 'W' at 0
received work 'l' at 3
received work 'o' at 1
received work 'o' at 7
received work 'd' at 4
finished work 'e' -> 'r' at 1
received work 'y' at 6
received work 'l' at 9
finished work 'l' -> 'y' at 9
received work ' ' at 5
finished work ' ' -> ' ' at 5
received work 'e' at 13
finished work 'e' -> 'r' at 13
received work 'o' at 21
finished work 'o' -> 'b' at 21
finished work 'y' -> 'l' at 6
received work ' ' at 14
finished work ' ' -> ' ' at 14
received work 'c' at 22
finished work 'c' -> 'p' at 22
finished work 'l' -> 'y' at 3
received work 'i' at 11
finished work 'i' -> 'v' at 11
received work ' ' at 19
finished work ' ' -> ' ' at 19
received work '?' at 27
finished work '?' -> '?' at 27
finished work 'd' -> 'q' at 4
received work 'k' at 12
finished work 'k' -> 'x' at 12
received work 's' at 20
finished work 's' -> 'f' at 20
finished work 'o' -> 'b' at 7
received work 'm' at 15
finished work 'm' -> 'z' at 15
received work 'k' at 23
finished work 'k' -> 'x' at 23
finished work 'o' -> 'b' at 1
received work ' ' at 9
finished work ' ' -> ' ' at 9
received work 'r' at 17
finished work 'r' -> 'e' at 17
received work 't' at 25
finished work 't' -> 'g' at 25
finished work 'W' -> 'J' at 0
received work 'u' at 8
finished work 'u' -> 'h' at 8
received work 'o' at 16
finished work 'o' -> 'b' at 16
received work 'e' at 24
finished work 'e' -> 'r' at 24
received output 'Would you like more sockets?' -> 'Jbhyq lbh yvxr zber fbpxrgf?' in 5s
---
sending input 'Yes please.'
received work 'Y' at 0
received work 'l' at 5
finished work 'u' -> 'h' at 2
received work 'p' at 4
received work 'e' at 1
received work 'a' at 7
received work ' ' at 3
received work 's' at 2
finished work ' ' -> ' ' at 3
finished work 'a' -> 'n' at 7
received work 'l' at 10
finished work 'l' -> 'y' at 10
received work 'e' at 18
finished work 'e' -> 'r' at 18
received work 's' at 26
finished work 's' -> 'f' at 26
received work 'e' at 6
finished work 'e' -> 'r' at 6
finished work 'p' -> 'c' at 4
finished work 'l' -> 'y' at 5
finished work 's' -> 'f' at 2
received work '.' at 10
finished work '.' -> '.' at 10
finished work 'Y' -> 'L' at 0
received work 's' at 8
finished work 's' -> 'f' at 8
received output 'Yes please.' -> 'Lrf cyrnfr.' in 2s
---
finished work 'e' -> 'r' at 1
received work 'e' at 9
finished work 'e' -> 'r' at 9
all workers stopped
```
