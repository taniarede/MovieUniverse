# AI_LOG.md — utilização de IA

Este ficheiro documenta decisões em que sugestões de IA não foram aceites literalmente. Deve ser mantido verdadeiro e atualizado até à entrega.

## Caso 1 — Docker/Docker Compose
**Sugestão da IA:** usar Docker Compose para PostgreSQL e eventualmente Redis, por tornar o ambiente reproduzível.

**Porque não foi usada:** Docker era uma tecnologia nova para o projeto e o enunciado declara-a opcional. Introduzir containers aumentaria o número de conceitos e pontos de falha sem resolver um requisito funcional obrigatório.

**O que foi feito:** PostgreSQL e Node.js são executados localmente e o README documenta os pré-requisitos e passos de arranque.

## Caso 2 — Redis como cache TMDB
**Sugestão da IA:** adicionar Redis desde o início para guardar respostas da TMDB.

**Porque não foi usada:** cache é opcional e Redis acrescentaria outro serviço para instalar/configurar. Para a escala académica do projeto, a prioridade foi uma arquitetura simples.

**O que foi feito:** não foi implementada cache. O backend chama a TMDB diretamente. A decisão e a consequência (mais pedidos externos) ficam documentadas.

## Caso 3 — Média simples para juntar TMDB e utilizadores
**Sugestão inicial a evitar:** calcular `(mediaTMDB + mediaLocal) / 2`.

**Porque está errada para este enunciado:** trata 3 votos como se tivessem o mesmo peso de dezenas de milhares de votos, contrariando explicitamente o requisito.

**O que foi feito:** foi criada `calculateCombinedRating`, que regulariza a nota TMDB com referência 6,5/1000 e depois incorpora votos locais com peso proporcional ao seu número.

## Caso 4 — Guardar todos os dados dos filmes em PostgreSQL
**Sugestão possível da IA:** criar uma tabela `movies` com título, sinopse, poster, géneros e classificação TMDB.

**Porque não foi usada:** duplicaria dados cuja fonte de verdade é a TMDB e exigiria política de sincronização/expiração.

**O que foi feito:** a base guarda apenas `tmdb_id` nas relações locais; metadados de filmes são consultados à TMDB quando necessários.

## Regra de segurança seguida
A chave/token da TMDB e o `JWT_SECRET` não devem ser copiados para ferramentas de IA nem versionados. A documentação usa apenas nomes de variáveis e placeholders.
