/**
 * Types for the part of `@micropython/micropython-webassembly-pyscript` that the engine uses (the package
 * has no types). Apps that import the engine include this file in their `tsconfig.json`. Values that come
 * from Python are `unknown`: the engine checks them.
 */
declare module "@micropython/micropython-webassembly-pyscript" {
  export interface MicroPythonOptions {
    readonly url: string | undefined
    readonly heapsize: number
    readonly linebuffer: boolean
    readonly stdout: (bytes: Uint8Array) => void
    readonly stderr: (bytes: Uint8Array) => void
  }

  export interface MicroPython {
    readonly globals: { get(name: string): unknown }
    readonly FS: { writeFile(path: string, data: string): void; mkdirTree(path: string): void }
    registerJsModule(name: string, module: object): void
    runPython(code: string): unknown
  }

  export function loadMicroPython(options: MicroPythonOptions): Promise<MicroPython>
}
