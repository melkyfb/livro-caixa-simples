# Instruções de Manutenção do Projeto

## Atualizações de Esquema (Banco de Dados)
- Sempre que houver uma alteração estrutural no banco de dados, adicione uma nova entrada no array `MIGRATIONS` em `src/lib/database.ts`.
- Siga a convenção: `migration-{motivo}-{YYYY-MM-DD-HH:MM:SS}`.

## Atualizações de Versão e Auto-Updater
- Ao realizar um novo release, os seguintes passos são obrigatórios:
  1. Atualize a versão no `package.json` e `src-tauri/tauri.conf.json`.
  2. Atualize o arquivo `update.json` na raiz do projeto com a nova versão, notas de release e a URL do binário correspondente no GitHub Releases.
  3. Garante que o segredo `TAURI_SIGNING_PRIVATE_KEY` esteja configurado no GitHub para que o workflow de release assine o executável.
  4. A assinatura gerada (`.sig`) deve ser colada no campo `signature` do `update.json` após o build.

## Estilo Visual
- O projeto utiliza **Glassmorphism**. Utilize as classes `.glass-panel`, `.glass-card` e `.bg-glow` definidas em `src/index.css` para novos componentes.
