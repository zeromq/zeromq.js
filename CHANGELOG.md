### v6.0.0-beta.3

* Error details have been added to the "handshake:error:protocol" and "handshake:error:auth" events.

* Reading from event observers now prevent the Node process from exiting, even if the underlying socket is no longer being used.

* Reading or writing on unbound and unconnected sockets now prevent the Node process from exiting.

### v6.0.0-beta.2

* Fix omission of "zeromq/v5-compat" export.

### v6.0.0-beta.1

* BREAKING: Complete rewrite of ZeroMQ.js with a modern and safe API. This version is based on ZeroMQ-NG version v5.0.0-beta.27. A compatibility layer for existing users of versions 5.x or earlier of ZeroMQ.js is available as "zeromq/v5-compat".

### Previous changes

* See https://github.com/rolftimmermans/zeromq-ng/blob/master/CHANGELOG.md for the changelog of the next generation API before the merge back into ZeroMQ.js.

* See https://github.com/zeromq/zeromq.js/blob/5.x/History.md for the changelog of the previous API before the merge of ZeroMQ-NG.
