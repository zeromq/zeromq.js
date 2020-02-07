# template files for typescript compile test

the tsc versions test is for ensuring the library can be used in projects
with supported typescript versions

the test cases are specified in `test/unit/tsc-versions-test.ts`

during the test, temporary directories are created for the corresponding
typescript version x.x.x:
```
test/tsc-versions/ts-x.x.x/
    package.json
    tsconfig.json
    <modified copy of typings-test.ts>
```

the file `typings-test.ts` is copied from `test/unit/typings-test.ts`
and only its `import` statement for `zmq` is changed from
```typescript
// from:
import * as zmq from "../../src"
// modified to:
import * as zmq from "../../../"
```

relevant fields in `package.json` and `tsconfig.json` are set according to the
test case definition when they are copied to the temporary directory
