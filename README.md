<!-- markdownlint-disable first-line-h1 -->

<!-- markdownlint-start-capture -->
<!-- markdownlint-disable-file no-inline-html -->
<div align="center">

  <!-- markdownlint-disable-next-line no-alt-text -->
  <img src="docs/assets/logo.svg" alt="Logo" width="300" />
  
  <br>
  <br>

[![NPM Version](https://img.shields.io/npm/v/yuku?logo=npm&logoColor=212121&label=version&labelColor=ffc44e&color=212121)](https://npmjs.com/package/yuku)
[![NPM Downloads](https://img.shields.io/npm/dm/yuku?logo=npm&logoColor=212121&label=downloads&labelColor=ffc44e&color=212121)](https://npmtrends.com/yuku)
[![sponsor](https://img.shields.io/badge/sponsor-EA4AAA?logo=githubsponsors&labelColor=FAFAFA)](https://github.com/sponsors/arshad-yaseen)

Yuku is a JavaScript and TypeScript compiler toolchain written in Zig.

[Try it in the playground →](https://playground.yuku.fyi)

</div>

## Documentation

Visit [yuku.fyi](https://yuku.fyi) for the documentation.

## Install

```bash
npm install yuku
```

| Import                                                          | For                                               |
| --------------------------------------------------------------- | ------------------------------------------------- |
| [`yuku`](https://yuku.fyi/parser/#javascript)                   | Parse to an ESTree / TypeScript-ESTree AST        |
| [`yuku/analyzer`](https://yuku.fyi/parser/semantic/#javascript) | Resolve scopes, bindings, references, and imports |
| [`yuku/ast`](https://yuku.fyi/parser/ast/#javascript)           | Walk, build, and check an AST                     |
| [`yuku/codegen`](https://yuku.fyi/parser/codegen/#javascript)   | Print an AST back to source, with source maps     |
| [`yuku/types`](https://yuku.fyi/parser/ast/#javascript)         | TypeScript types for the AST                      |

For Zig, see [Install](https://yuku.fyi/#zig).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) to set up, test, and try a change. Report vulnerabilities privately, as [SECURITY.md](SECURITY.md) describes.

## License

Yuku is licensed under the [MIT License](LICENSE).
