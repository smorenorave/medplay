# Adaptador de directorios para ESLint de Next.js

El plugin `@next/eslint-plugin-next@15.5.27` solo usa `fast-glob` en
`dist/utils/get-root-dirs.js`: llama a `globSync` con un patrón de directorio
y `onlyDirectories: true`. Su dependencia original incorpora la cadena
`micromatch` → `braces`, afectada por
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

El override de `package.json` sustituye esa dependencia por este adaptador
local, que usa `tinyglobby@0.2.17`. No modifica las reglas del plugin ni es
un reemplazo general de todas las APIs de `fast-glob`.

El adaptador desactiva `expandDirectories` para devolver los directorios
coincidentes sin incluir sus descendientes. Las rutas literales se validan
con `statSync`, evitando que un directorio absoluto se convierta en un
matcher vacío dentro de tinyglobby. Los patrones siguen usando tinyglobby.

La sustitución está limitada a la versión 15.5.27 del plugin. Al actualizar
Next.js o ESLint, revisar los usos de glob del nuevo plugin y retirar este
override cuando upstream elimine o corrija la dependencia vulnerable.

Validación reproducible:

```sh
npm ci --ignore-scripts
node --test tests/eslintGlob.test.cjs
npm audit
npm run lint
npm run typecheck
npm run build
```

Las pruebas comprueban rutas Windows, raíces múltiples, comodines, llaves,
exclusión de archivos y rutas inexistentes, y que la regla de Next.js sigue
reportando enlaces internos a la página de inicio sin `next/link`.
