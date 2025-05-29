import memjs from "memjs";
import { serverEnv } from "./env";

export const memcache = memjs.Client.create(serverEnv.MEMCACHE_URL);
