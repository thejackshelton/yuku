export let yuku = null;

export const ready = fetch(new URL("../yuku.wasm", import.meta.url))
  .then((response) => {
    if (!response.ok) throw new Error(`yuku-parser: ${response.url} has status ${response.status}`);
    return response.arrayBuffer();
  })
  .then((bytes) => WebAssembly.compile(bytes))
  .then((module) => {
    yuku = module;
  });
