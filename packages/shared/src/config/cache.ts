import memjs from "memjs";
import { serverEnv } from "./env.js";

export const memcache = memjs.Client.create(serverEnv.MEMCACHE_URL);
