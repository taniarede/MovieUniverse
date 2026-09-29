# DECISIONS.md — MovieUniverse Hub

## 1. Stack: React + Express + TypeScript + PostgreSQL
Foi escolhida uma arquitetura separada frontend/backend: React + Vite no browser, Node.js/Express no servidor e PostgreSQL para persistência. TypeScript é usado nos dois lados para reduzir erros de tipos. PostgreSQL adequa-se às relações claras entre utilizadores, playlists, filmes e notas.

## 2. Execução local sem Docker
Docker não foi adotado. O enunciado torna-o opcional e a prioridade foi reduzir complexidade de infraestrutura: Node.js e PostgreSQL correm diretamente na máquina. Esta decisão deve ser compensada por instruções completas e reproduzíveis no README.

## 3. Redis/cache não implementado
A cache TMDB é opcional. Não foi adicionada Redis nem cache persistente para evitar mais uma dependência local. O custo é repetir pedidos ao TMDB em pesquisas, detalhes e comparação. Se o volume crescer, uma cache em memória com TTL seria o primeiro passo; Redis faria sentido apenas se fosse necessária persistência/partilha de cache.

## 4. Não persistir catálogo TMDB
A base local guarda `tmdb_id`, mas não duplica título, sinopse, poster ou média TMDB. Os dados atuais são obtidos da TMDB quando necessários. Evita dados desatualizados e simplifica o modelo, em troca de dependência de rede.

## 5. Registo com username, email e password
Apesar de o enunciado permitir apenas um nome, foi implementada autenticação mais robusta. Passwords são processadas com Argon2id; a sessão usa JWT HS256 em cookie HttpOnly com duração de uma hora. O email é usado para login.

## 6. Regra da nota combinada
A média simples foi rejeitada porque ignora a confiança dada pelo número de votos.

A implementação usa duas etapas:
```text
adjustedTmdb = (tmdbRating * tmdbVotes + 6.5 * 1000) / (tmdbVotes + 1000)
combined = (adjustedTmdb * 20 + appAverage * appVotes) / (20 + appVotes)
```
Se `appAverage` não existir, o total local é zero. Se não houver votos TMDB nem locais, a função devolve `null`.

A referência 6,5/1000 regulariza filmes com poucos votos TMDB. O peso 20 impede que apenas alguns votos locais alterem drasticamente a classificação. A função é pura e reutilizada no detalhe do filme e na comparação de playlists.

## 7. Comparação de playlists
Cada filme recebe a mesma nota combinada usada no detalhe. A classificação da playlist é a média aritmética das notas combinadas válidas dos seus filmes. Filmes sem informação suficiente são excluídos e devolvidos em `excludedTmdbIds`. Em empate, `winnerRef` é `null`. A resposta também apresenta IDs de filmes em comum.

## 8. Dados problemáticos do seed
- Playlists com `apagada=true`: são importadas, marcadas `is_deleted=true` e escondidas das listagens normais.
- Filme repetido na mesma playlist: apenas a primeira ocorrência ordenada é importada. A chave `(playlist_id, tmdb_id)` também impede duplicação.
- Filmes com o mesmo título/anos diferentes: não há conflito porque a identidade é o `tmdb_id`, não o título.
- Filmes apenas em playlists apagadas: continuam importados na relação, mas não aparecem em listagens de playlists ativas.
- Importação repetida: `ON CONFLICT ... DO UPDATE` torna o comando idempotente.

## 9. Número de votos
O número de votos é parte essencial da nota, não apenas informação visual. O TMDB fornece `vote_count`; a aplicação calcula `COUNT(*)` das avaliações locais. Na ficha, média e número de votos são apresentados separadamente para TMDB e comunidade.

## 10. Soft delete de playlists
Apagar uma playlist altera `is_deleted` em vez de remover fisicamente a linha. Isto preserva integridade e é compatível com o seed, que contém playlists apagadas.

## 11. Jogo “mais alto ou mais baixo”
Não implementado. É uma funcionalidade opcional. Se for implementado, deve chamar `calculateCombinedRating` em vez de duplicar a fórmula. Proposta: diferença mínima de 0,5, excluir filmes sem nota combinada e selecionar pares das playlists do utilizador. Esta proposta não descreve comportamento atualmente existente.
