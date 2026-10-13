export let yuku: WebAssembly.Module | null = null;

export const ready: Promise<void> = fetch(new URL("../yuku.wasm", import.meta.url))
  .then((response) => {
    if (!response.ok) throw new Error(`yuku: ${response.url} has status ${response.status}`);
    return response.arrayBuffer();
  })
  .then((bytes) => WebAssembly.compile(bytes))
  .then((module) => {
    yuku = module;
  });
