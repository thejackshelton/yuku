import base64 from "../yuku.wasm";
import { decodeBase64 } from "../base64";
import { NodeBuffer } from "../node";

export const yuku: WebAssembly.Module = new WebAssembly.Module(bytesOf(base64));

function bytesOf(text: string): Uint8Array<ArrayBuffer> {
  const native = Uint8Array as { fromBase64?(text: string): Uint8Array<ArrayBuffer> };
  if (native.fromBase64 !== undefined) return native.fromBase64(text);
  if (NodeBuffer !== undefined) return NodeBuffer.from(text, "base64");
  return decodeBase64(text);
}
