declare module "#module" {
  export const yuku: WebAssembly.Module;
}

declare module "#wasm" {
  const module: WebAssembly.Module;
  export default module;
}

declare module "*.wasm" {
  const base64: string;
  export default base64;
}
