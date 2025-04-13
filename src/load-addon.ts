import {loadAddon} from "cmake-ts/build/loader"
import path from "path"

const addon = loadAddon(path.resolve(__dirname, "..", "build"))
export default addon
