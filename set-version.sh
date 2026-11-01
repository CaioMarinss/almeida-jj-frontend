#!/bin/bash
# Atualiza a versão do projeto no package.json/package-lock.json e abre a seção da versão no CHANGELOG.md.
# Uso: ./set-version.sh 0.0.2   (aceita também "v0.0.2")
# Não faz commit nem cria tag — os próximos passos são impressos ao final.
set -euo pipefail

cd "$(dirname "$0")"

if [ $# -ne 1 ]; then
  echo "Uso: $0 <versao>   ex.: $0 0.0.2" >&2
  exit 1
fi

VERSION="${1#v}"
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Versão inválida: '$1'. Use o formato X.Y.Z (ex.: 0.0.2)." >&2
  exit 1
fi

if git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null; then
  echo "A tag v$VERSION já existe." >&2
  exit 1
fi

# --- package.json + package-lock.json (sem criar commit/tag do npm) ---
CURRENT="$(node -p "require('./package.json').version")"
if [ "$CURRENT" != "$VERSION" ]; then
  npm version "$VERSION" --no-git-tag-version >/dev/null
fi

# --- CHANGELOG.md: transforma "Não lançado" na nova versão e abre uma seção vazia ---
if [ -f CHANGELOG.md ] && grep -q '^## \[Não lançado\]' CHANGELOG.md; then
  TODAY="$(date +%Y-%m-%d)"
  sed -i "0,/^## \[Não lançado\]/s//## [Não lançado]\n\n## [$VERSION] - $TODAY/" CHANGELOG.md
else
  echo "Aviso: seção '## [Não lançado]' não encontrada no CHANGELOG.md; changelog não alterado." >&2
fi

echo "Versão atualizada para $VERSION:"
echo "  package.json: $(node -p "require('./package.json').version")"
echo "  package-lock.json: $(node -p "require('./package-lock.json').version")"
echo
echo "Próximos passos:"
echo "  1. Revise o CHANGELOG.md (itens da versão $VERSION)"
echo "  2. git commit -am \"chore: release v$VERSION\""
echo "  3. git tag -a v$VERSION -m \"v$VERSION\" && git push && git push origin v$VERSION"
