## Unreleased

* Improved TypeScript compatibility by supplying version-specific types for situations where generated TypeScript typings are not backwards compatible. This reduces the minimum required TypeScript version to 3.0.

### v6.0.0-beta.6

* BREAKING: When inadvertedly executing two concurrent send() or receive() operations the errno attribute of the error thrown is now EBUSY instead of EAGAIN.

* Error messages for EBUSY are more specific.

* Compatibility mode will now provide an implementation for bindSync()/unbindSync() if the 'deasync' package is available.

* Produce a warning when messages are still queued at process exit and context termination takes more than 500ms.

* Bump version requirement to Node.js 10.2, but reduce N-API version to 3 to support more 10.x Node.js versions.

### v6.0.0-beta.5

* Check if properties are defined before defining them. This ensures compatibility with alternative file loaders, notably by the Jest test framework.

* Performance of calling methods & validating arguments has been improved.

* Header files from node-addon-api are now bundled to reduce runtime depedencies.

### v6.0.0-beta.4

* Break out of busy loops automatically when the number of synchronous I/O operations moves beyond a built-in threshold. This avoids the ZeroMQ background I/O process(es) starving the Node.js event loop when it can process messages faster than the application. This could have caused decreased responsiveness and/or high memory usage. This only happens when sending/receiving messages as quickly as possible, such as in a benchmark or in test code.

* Fixed a memory leak in socket construction that would manifest itself when repeatedly creating many sockets.

### v6.0.0-beta.3

* Error details have been added to the "handshake:error:protocol" and "handshake:error:auth" events.

* Reading from event observers now prevents the Node process from exiting, even if the underlying socket is no longer being used.

* Reading or writing on unbound and unconnected sockets now prevents the Node process from exiting.

### v6.0.0-beta.2

* Fix omission of "zeromq/v5-compat" export.

### v6.0.0-beta.1

* BREAKING: Complete rewrite of ZeroMQ.js with a modern and safe API. This version is based on ZeroMQ-NG version v5.0.0-beta.27. A compatibility layer for existing users of versions 5.x or earlier of ZeroMQ.js is available as "zeromq/v5-compat".

### Previous changes

* See https://github.com/rolftimmermans/zeromq-ng/blob/master/CHANGELOG.md for the changelog of the next generation API before the merge back into ZeroMQ.js.

* See https://github.com/zeromq/zeromq.js/blob/5.x/History.md for the changelog of the previous API before the merge of ZeroMQ-NG.
