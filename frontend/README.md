# MovieUniverse Hub

Aplicação local para descobrir filmes através da TMDB, criar playlists, avaliar filmes e comparar listas de exemplo. Frontend React/TypeScript, API Express/TypeScript e PostgreSQL.

## Pré-requisitos

- Node.js 22 ou superior e npm
- PostgreSQL 18 (ou uma versão compatível) com `psql`
- Uma conta TMDB e um API Read Access Token

## Instalação no Windows (PowerShell)

Os comandos seguintes partem da pasta que contém `backend` e `frontend`. Se `psql` não estiver no PATH, substitui `psql` por `& "C:\Program Files\PostgreSQL\18\bin\psql.exe"`.

1. Cria a base de dados: `psql -U postgres -c "CREATE DATABASE movieuniverse;"`. Se já existir, salta este comando.
2. Executa, **por ordem e apenas uma vez**, os seis ficheiros de `backend/sql`:

   ```powershell
   Get-ChildItem .\backend\sql\*.sql | Sort-Object Name | ForEach-Object {
     psql -X -v ON_ERROR_STOP=1 -U postgres -d movieuniverse -f $_.FullName
     if ($LASTEXITCODE -ne 0) { throw "Falhou $($_.Name)" }
   }
   ```

3. Copia `backend/.env.example` para `backend/.env` e preenche `DB_PASSWORD`, `TMDB_READ_TOKEN` e `JWT_SECRET`. Usa uma chave JWT longa e aleatória. Não publiques o `.env`.
4. Instala as dependências e importa os dados fornecidos sem alterar o JSON:

   ```powershell
   cd backend
   npm ci
   npm run seed
   npm run check
   npm run dev
   ```

5. Noutro terminal, a partir da pasta `frontend`:

   ```powershell
   npm ci
   npm run build
   npm run lint
   npm run dev
   ```

6. Abre `http://localhost:5173`. A API corre em `http://localhost:3000`; o proxy Vite encaminha `/api` durante o desenvolvimento. Para confirmar, abre `http://localhost:3000/health` e `http://localhost:3000/db-health`.

O importador lê `backend/seed_playlists/seed_playlists.json`. `npm run seed` pode ser repetido: usa chaves únicas e atualizações para evitar duplicados. As contas de exemplo são apenas dados para explorar e comparar; não têm email nem palavra-passe. Regista uma conta pessoal no site para gerir playlists e notas.

## Funcionalidades e verificação

- Pesquisa por título com paginação, cartaz, nota TMDB e votos; filmes sem votos aparecem como «sem votos».
- Detalhe com sinopse, géneros, duração, cartaz, médias, votos e nota combinada.
- Registo e login; passwords com Argon2id; playlists e notas pessoais protegidas por token.
- Criação e remoção de playlists; estrela nos cartões para adicionar/remover filmes; nota pessoal de 1 a 10 editável.
- Listas de exemplo importadas, incluindo listas apagadas ocultas, ordem e comparação com média por filme e filmes em comum.
- Top TMDB identificado separadamente da nota combinada MovieUniverse.

Casos rápidos: pesquisar «Matrix», abrir detalhes, avaliar com 8,5 e editar para 9,0; adicionar/remover Matrix por ★; comparar `pl-01` com `pl-08`; correr `npm run seed` duas vezes e verificar que não duplica linhas; consultar um filme sem votos e confirmar que não mostra 0 como rating.

A lista Top TMDB e os cartazes dependem da disponibilidade da TMDB. O token fica apenas no backend. Esta aplicação não é aprovada nem certificada pelo TMDB. Os dados e cartazes são fornecidos pelo TMDB.

## Estrutura

- `backend/src/routes`: endpoints de filmes, utilizadores, playlists e avaliações.
- `backend/src/services`: nota combinada e comparação.
- `backend/src/scripts/importSeed.ts`: importação transacional dos dados fornecidos.
- `backend/sql`: criação e migrações por ordem numérica.
- `frontend/src/components`: interface por funcionalidade.
- `DECISIONS.md`: fórmulas, limites e escolhas técnicas.


A especificação OpenAPI e o jogo são extensões opcionais que não foram implementadas. Não há cache; as consultas TMDB são feitas em tempo real.
