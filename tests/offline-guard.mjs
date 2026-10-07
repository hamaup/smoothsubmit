import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { syncBuiltinESMExports } from "node:module";
const blocked = () => {
  throw new Error("NETWORK_FORBIDDEN_IN_AUDIT");
};
for (const m of [http, https]) {
  m.request = blocked;
  m.get = blocked;
}
net.connect = blocked;
net.createConnection = blocked;
tls.connect = blocked;
globalThis.fetch = blocked;
syncBuiltinESMExports();
