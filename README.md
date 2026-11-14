# Rota de entregas por colônia de formigas (Ant System)

Universidade Federal do Piauí · Inteligência Artificial · Período 2026.2
Atividade Prática sobre Colônia de Formigas

**Aplicação publicada (GitHub Pages):** https://hedersonfranco.github.io/colonia-formigas/
**Repositório:** https://github.com/HedersonFranco/colonia-formigas

## Autores

- Hederson Franco Benvindo Lima
- David Soares Pereira Junior
- João Guilherme Oliveira Pereira

## Descrição da solução

Simulador, executado inteiramente no navegador, que planeja a rota de um veículo que sai do depósito, visita cada ponto de entrega exatamente uma vez e volta ao depósito, minimizando a distância total. Os locais formam um grafo completo, não direcionado, com distância euclidiana `d(i,j) = √((x(i) − x(j))² + (y(i) − y(j))²)`.

A busca usa a variante **Ant System**, implementada pelo grupo, sem bibliotecas de IA ou otimização:

1. Todas as arestas começam com o mesmo feromônio τ₀ (a diagonal da matriz fica em 0).
2. Em cada iteração, cada formiga parte do depósito e, a cada passo, considera só os vértices ainda não visitados. Para cada candidato `j` calcula `w(i,j) = τ(i,j)^α × (1/d(i,j))^β` e `p(i,j) = w(i,j) / Σ w(i,u)`. O próximo vértice é sorteado por roleta (sorteio proporcional), e não pelo maior peso. Com um único candidato, `p = 1`. Depois de visitar todos, a formiga volta obrigatoriamente ao depósito.
3. Todas as formigas da iteração leem a **mesma** matriz de feromônio (a do fim da iteração anterior). Só depois que todas terminam é aplicada a atualização `τ_novo(i,j) = (1 − ρ) × τ_antigo(i,j) + Σ Δτk(i,j)`, com `Δτk = Q / Lk` nas arestas percorridas pela formiga k, inclusive a de retorno ao depósito. A matriz é mantida simétrica e cada formiga contribui no máximo uma vez por aresta.
4. Após a atualização, cada aresta fica com no mínimo 10⁻¹² (proteção numérica apenas).
5. São registradas a melhor rota de cada iteração e a melhor de toda a execução. A execução termina no número configurado de iterações.

Os sorteios usam um gerador pseudoaleatório com semente (Mulberry32, implementado em `js/rng.js`). A ordem dos sorteios é fixa (formiga 1 a N, passo a passo), por isso os mesmos dados, parâmetros e semente reproduzem o histórico. O intervalo entre iterações (controle de velocidade) só define o `setTimeout` da tela e não consome números aleatórios.

### Estrutura do código

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Página do simulador |
| `css/style.css` | Estilos (tema claro e escuro) |
| `js/rng.js` | Gerador pseudoaleatório com semente |
| `js/aco.js` | Núcleo do algoritmo: distâncias, probabilidades, roleta, construção das rotas, evaporação e depósito, validação das entradas |
| `js/ui.js` | Interface: tabela de vértices, controles, grafo em SVG, métricas, gráfico, histórico e registros |
| `tests/tests.js` | Testes de validação da seção 6 (mesmo código no navegador e no Node) |
| `tests/run-node.js` | Executa os testes no Node e gera `tests/resultados.md` |
| `tests.html` | Executa os testes no navegador |

O núcleo (`js/aco.js`) não depende da interface, e a interface só exibe dados produzidos pelo núcleo; os valores mostrados na tela são os da execução real.

## Instruções de uso

1. Abra a aplicação pelo link do GitHub Pages (não precisa de login nem instalação). Ela inicia com um cenário de 8 vértices, depósito em A.
2. Edite a tabela de vértices (identificador, x, y), adicione ou remova vértices (entre 4 e 12) e escolha o depósito. O botão **Instância de teste (6.1)** carrega A(0,0), B(3,0), C(3,4), D(0,4) com os parâmetros da seção 6.4.
3. Ajuste os parâmetros. Qualquer alteração bloqueia **Executar** e **Avançar** até clicar em **Reiniciar**; campos vazios ou inválidos geram mensagens e destacam o campo.
4. Controles:
   - **Executar**: roda as iterações até o fim (ou retoma depois de uma pausa).
   - **Pausar**: interrompe preservando todo o estado.
   - **Avançar uma iteração**: completa exatamente uma iteração e permanece pausado.
   - **Reiniciar**: aplica os dados atuais, limpa o histórico, restaura τ₀ e restabelece a semente.
   - **Intervalo entre iterações**: ritmo visual, sem efeito nos resultados.
5. Acompanhe:
   - **Métricas**: iteração atual, menor distância da iteração, média das formigas, melhor distância acumulada e sequência da melhor rota. Na iteração 0 aparece "ainda não calculada".
   - **Grafo**: depósito em quadrado escuro, pontos de entrega em círculos, todas as arestas desenhadas. Espessura e intensidade da cor âmbar representam o feromônio; a melhor rota acumulada aparece em verde-azulado com setas de sentido. Passe o cursor sobre uma aresta para ver distância, feromônio, peso w e a última atualização; clique para fixar no painel **Consultar aresta** (que também tem uma lista com todas as arestas). A opção **Mostrar τ nas arestas** exibe os valores numéricos.
   - **Escala visual**: a espessura máxima corresponde a uma referência que só aumenta, em degraus 1, 2, 5, 10, 20…, quando algum τ a ultrapassa. Assim, uma redução de feromônio nunca aparece como aumento. Quando a escala muda, um aviso destacado informa a iteração e o novo valor.
   - **Evolução**: gráfico com menor distância da iteração, média e melhor acumulada, e tabela com uma linha por iteração (incluindo a iteração 0).
   - **Registros da execução** (painéis expansíveis): construção passo a passo da rota (vértice atual, candidatos, τ, d, w, p, faixa da roleta, número sorteado, vértice escolhido e retorno ao depósito), rotas e comprimentos de todas as formigas e, para cada aresta, feromônio anterior, após evaporação, depósito total, quantas formigas passaram, valor final e variação. Na última iteração é possível ver qualquer formiga; nas anteriores fica guardada a construção da formiga 1.
6. A página **Testes de validação** (`tests.html`) executa todos os testes da seção 6 no próprio navegador.

## Parâmetros

| Campo | Valor inicial | Faixa aceita |
|---|---|---|
| Vértices (ID, x, y) | 8 vértices (A a H) | 4 a 12 vértices; ID único e não vazio; x e y finitos entre 0 e 1.000, até 2 casas decimais; coordenadas não podem se repetir |
| Depósito | A | um dos vértices cadastrados |
| Número de formigas | 10 | inteiro de 1 a 100 |
| Número de iterações | 50 | inteiro de 1 a 200 |
| Influência do feromônio (α) | 1 | 0 a 5 (0 = feromônio não influencia) |
| Influência da distância (β) | 2 | 0 a 5 (0 = distância não influencia) |
| Taxa de evaporação (ρ) | 50% | 0% a 90%, convertida em fração (50% → 0,5) |
| Feromônio inicial (τ₀) | 1 | 0,01 a 100 |
| Constante de depósito (Q) | 1000 | 0,01 a 10.000 |
| Semente aleatória | 42 | inteiro de 0 a 4.294.967.295 |

Aceita-se vírgula ou ponto como separador decimal. Os cálculos usam precisão total; o arredondamento é feito só na exibição.

## Bibliotecas auxiliares

Nenhuma biblioteca JavaScript foi usada. O grafo e o gráfico são desenhados em SVG pelo próprio código, e o gerador com semente foi escrito no projeto seguindo o algoritmo público Mulberry32. A única dependência externa é a fonte tipográfica IBM Plex Sans, carregada do Google Fonts apenas para aparência; sem ela, o navegador usa uma fonte do sistema.

## Testes de validação

Os testes estão em `tests/tests.js` e usam exatamente as funções da aplicação. Nos testes controlados, as rotas e escolhas são fornecidas diretamente às funções (`constructRoute` com um gerador fixo, `step({ forcedRoutes })`, `validateConfig`), sem campos extras na interface. Comparações decimais usam tolerância absoluta de 0,000001.

Como executar:

- no navegador: abra `tests.html` (também acessível pelo link no topo da aplicação);
- no terminal: `node tests/run-node.js` (Node 16 ou superior).

Os resultados abaixo foram obtidos com `node tests/run-node.js`. As verificações que dependem da tela (pausa, velocidade, botões) estão na seção "Verificações na interface".

### Entradas e parâmetros usados

- **6.1 e 6.2:** A(0,0), B(3,0), C(3,4), D(0,4), depósito A; τ = 1 em todas as arestas; α = 1, β = 2 (e α = β = 0 no teste de igualdade).
- **6.3:** τ₀ = 1, ρ = 50%, Q = 14; uma formiga com a rota forçada A → B → C → D → A em uma e em duas iterações; depois duas formigas na mesma rota; ρ = 0% com a mesma rota; e ρ = 90%, τ₀ = 0,01, Q = 0,01 por 20 iterações para verificar o piso.
- **6.4:** instância 6.1, depósito A, 10 formigas, 30 iterações, α = 1, β = 2, ρ = 50%, τ₀ = 1, Q = 14, semente 42.
- **6.5:** parâmetros da 6.4 com β = 0 e β = 2, sementes 1 a 5; ρ = 0% em execução completa; e as entradas inválidas listadas na tabela.

### Saídas obtidas

Resultado: **47 de 47 verificações aprovadas** (tolerância absoluta 0,000001).

| Seção | Verificação | Situação | Saída obtida |
|---|---|---|---|
| 6.1 | Distâncias euclidianas da instância de referência | Aprovado | A-B = 3; A-C = 5; A-D = 4; B-C = 4; B-D = 5; C-D = 3; d(i,i) = 0 |
| 6.1 | Comprimento das seis rotas possíveis a partir de A | Aprovado | A → B → C → D → A = 14; A → B → D → C → A = 16; A → C → B → D → A = 18; A → C → D → B → A = 16; A → D → B → C → A = 18; A → D → C → B → A = 14 |
| 6.1 | Rotas incompletas ou com repetição são rejeitadas | Aprovado | A → B → C → A / A → B → B → D → A / A → B → C → D / B → A → C → D → B / A → B → C → D → B → todas inválidas |
| 6.1 | Rotas construídas pelas formigas são válidas e medem 14, 16 ou 18 | Aprovado | 300 rotas verificadas (10 formigas × 30 iterações); comprimentos observados: 14; 16; 18 |
| 6.2 | Probabilidades em A (τ = 1, α = 1, β = 2) | Aprovado | w(A,B) = 0,111111, w(A,C) = 0,040000, w(A,D) = 0,062500; p(A,B) = 0,520156, p(A,C) = 0,187256, p(A,D) = 0,292588; soma = 1,000000 |
| 6.2 | Após visitar B, só C e D participam do sorteio | Aprovado | candidatos em B: C, D; p(B,C) = 0,609756, p(B,D) = 0,390244 |
| 6.2 | α = 0 e β = 0: probabilidades iguais (mesmo com τ e d diferentes) | Aprovado | em A: 0,333333, 0,333333, 0,333333; em B (C, D): 0,500000, 0,500000 |
| 6.2 | Único candidato restante: probabilidade 1 | Aprovado | p(C,D) = 1,000000; no 3º passo da construção há 1 candidato com p = 1,000000 (sem sorteio) |
| 6.2 | Sorteio proporcional (roleta), sem escolher sempre o maior peso | Aprovado | r = 0 / 0,52 / 0,5202 / 0,8 / 0,99999 → B, B, C, D, D; frequências em 100000 sorteios: B 0,518870, C 0,187190, D 0,293940 |
| 6.3 | Uma formiga, rota forçada A → B → C → D → A (1ª iteração) | Aprovado | L = 14; após evaporação todas = 0,5; AB = BC = CD = AD = 1,5; AC = BD = 0,5. Log AB: "anterior 1; após evaporação 0,5; depósito 1; final 1,5". Log AC: "anterior 1; após evaporação 0,5; depósito 0; final 0,5" |
| 6.3 | Segunda iteração com a mesma rota forçada | Aprovado | perímetro = 1,75; 1,75; 1,75; 1,75; diagonais = 0,25; 0,25 |
| 6.3 | Duas formigas na mesma rota (soma dos depósitos) | Aprovado | perímetro = 2,5 (depósito total 2 de 2 formigas); diagonais = 0,5 |
| 6.3 | Simetria τ(i,j) = τ(j,i) e diagonal sem feromônio | Aprovado | matriz final da execução da seção 6.4 verificada |
| 6.3 | Piso numérico de 10⁻¹² por aresta | Aprovado | ρ = 90%, τ₀ = 0,01, 20 iterações: τ(A,C) seria 0,01 × 0,1²⁰ = 1e-22 → mantido em 1e-12 |
| 6.4 | Execução completa (10 formigas, 30 iterações, α = 1, β = 2, ρ = 50%, τ₀ = 1, Q = 14, semente 42) | Aprovado | iteração 0: τ = 1 e melhor distância "ainda não calculada"; 30 registros; melhor acumulada nunca aumenta; melhor rota A → D → C → B → A = 14 (iteração 1) |
| 6.4 | Reprodutibilidade com os mesmos dados, parâmetros e semente | Aprovado | duas execuções novas e uma após Reiniciar produziram histórico e feromônios idênticos |
| 6.4 | Pausar e retomar (ou avançar iteração a iteração) preserva o resultado | Aprovado | execução pausada na iteração 12 e retomada = execução contínua = execução por "Avançar" |
| 6.4 | Todas as formigas da iteração usam os feromônios da iteração anterior | Aprovado | 300 probabilidades conferidas nas 5 primeiras iterações contra a matriz τ do início de cada iteração |
| 6.5 | Comparação β = 0 × β = 2 (sementes 1 a 5, demais parâmetros da 6.4) | Aprovado | β = 0: média 14, 5/5 atingiram 14; β = 2: média 14, 5/5 atingiram 14 |
| 6.5 | ρ = 0%: evaporação não reduz o feromônio | Aprovado | rota forçada: perímetro 1 → 2, diagonais permanecem 1; execução completa com ρ = 0: nenhuma aresta diminuiu em 30 iterações |
| 6.5 | Entrada: Configuração válida (controle) | Aprovado | aceita |
| 6.5 | Entrada: Coordenadas duplicadas | Aprovado | bloqueada: Vértice B tem as mesmas coordenadas (0; 0) da linha 1; isso produziria distância zero. |
| 6.5 | Entrada: Identificador repetido | Aprovado | bloqueada: Identificador "A" repetido (linhas 1 e 2). |
| 6.5 | Entrada: Menos de quatro vértices | Aprovado | bloqueada: São necessários pelo menos 4 vértices (há 3). |
| 6.5 | Entrada: Mais de doze vértices | Aprovado | bloqueada: São permitidos no máximo 12 vértices (há 13). |
| 6.5 | Entrada: Identificador vazio | Aprovado | bloqueada: Linha 3: o identificador do vértice está vazio. |
| 6.5 | Entrada: Coordenada vazia | Aprovado | bloqueada: Vértice C, coordenada x: campo vazio. |
| 6.5 | Entrada: Número de formigas vazio | Aprovado | bloqueada: Número de formigas: campo vazio. |
| 6.5 | Entrada: Formigas = 0 | Aprovado | bloqueada: Número de formigas: deve estar entre 1 e 100 (recebido 0). |
| 6.5 | Entrada: Formigas = 101 | Aprovado | bloqueada: Número de formigas: deve estar entre 1 e 100 (recebido 101). |
| 6.5 | Entrada: Formigas não inteiro (2.5) | Aprovado | bloqueada: Número de formigas: informe um número inteiro. |
| 6.5 | Entrada: Iterações = 0 | Aprovado | bloqueada: Número de iterações: deve estar entre 1 e 200 (recebido 0). |
| 6.5 | Entrada: Iterações = 201 | Aprovado | bloqueada: Número de iterações: deve estar entre 1 e 200 (recebido 201). |
| 6.5 | Entrada: α = 5,1 | Aprovado | bloqueada: Influência do feromônio (α): deve estar entre 0 e 5 (recebido 5,1). |
| 6.5 | Entrada: β = −1 | Aprovado | bloqueada: Influência da distância (β): deve estar entre 0 e 5 (recebido -1). |
| 6.5 | Entrada: ρ = 91% | Aprovado | bloqueada: Taxa de evaporação (ρ): deve estar entre 0% e 90% (recebido 91). |
| 6.5 | Entrada: τ₀ = 0 | Aprovado | bloqueada: Feromônio inicial (τ₀): deve estar entre 0,01 e 100 (recebido 0). |
| 6.5 | Entrada: τ₀ = 100,5 | Aprovado | bloqueada: Feromônio inicial (τ₀): deve estar entre 0,01 e 100 (recebido 100.5). |
| 6.5 | Entrada: Q = 0 | Aprovado | bloqueada: Constante de depósito (Q): deve estar entre 0,01 e 10.000 (recebido 0). |
| 6.5 | Entrada: Q = 10000,01 | Aprovado | bloqueada: Constante de depósito (Q): deve estar entre 0,01 e 10.000 (recebido 10000.01). |
| 6.5 | Entrada: x = 1000,01 | Aprovado | bloqueada: Vértice B, coordenada x: deve estar entre 0 e 1.000 (recebido 1000.01). |
| 6.5 | Entrada: y = −0,5 | Aprovado | bloqueada: Vértice B, coordenada y: deve estar entre 0 e 1.000 (recebido -0.5). |
| 6.5 | Entrada: x com três casas decimais (1.234) | Aprovado | bloqueada: Vértice B, coordenada x: use no máximo 2 casas decimais (recebido 1.234). |
| 6.5 | Entrada: x não numérico (abc) | Aprovado | bloqueada: Vértice B, coordenada x: "abc" não é um número válido. |
| 6.5 | Entrada: Semente não inteira (4.2) | Aprovado | bloqueada: Semente aleatória: informe um número inteiro. |
| 6.5 | Entrada: Semente vazia | Aprovado | bloqueada: Semente aleatória: campo vazio. |
| 6.5 | Entrada: Depósito inexistente | Aprovado | bloqueada: Selecione um depósito entre os vértices cadastrados. |

### Histórico da execução 6.4 (semente 42)

Melhor rota acumulada: **A → D → C → B → A**, comprimento **14**, encontrada na iteração 1.

| Iteração | Menor da iteração | Média das formigas | Melhor acumulada | Melhor rota da iteração | τ(A,B) final | τ(A,C) final |
|---|---|---|---|---|---|---|
| 0 | — | — | ainda não calculada | — | 1 | 1 |
| 1 | 14 | 14,8 | 14 | A → D → C → B → A | 10 | 4 |
| 2 | 14 | 15 | 14 | A → B → C → D → A | 13,625 | 5,402778 |
| 3 | 14 | 14,6 | 14 | A → B → C → D → A | 15,6875 | 4,354167 |
| 4 | 14 | 14,6 | 14 | A → B → C → D → A | 17,46875 | 4,802083 |
| 5 | 14 | 14,2 | 14 | A → B → C → D → A | 18,609375 | 3,276042 |
| 6 | 14 | 14,2 | 14 | A → D → C → B → A | 19,179688 | 2,513021 |
| 7 | 14 | 14,4 | 14 | A → B → C → D → A | 19,339844 | 3,00651 |
| 8 | 14 | 14 | 14 | A → B → C → D → A | 19,669922 | 1,503255 |
| 9 | 14 | 14 | 14 | A → D → C → B → A | 19,834961 | 0,751628 |
| 10 | 14 | 14 | 14 | A → D → C → B → A | 19,91748 | 0,375814 |
| 11 | 14 | 14 | 14 | A → D → C → B → A | 19,95874 | 0,187907 |
| 12 | 14 | 14 | 14 | A → D → C → B → A | 19,97937 | 0,093953 |
| 13 | 14 | 14 | 14 | A → B → C → D → A | 19,989685 | 0,046977 |
| 14 | 14 | 14 | 14 | A → B → C → D → A | 19,994843 | 0,023488 |
| 15 | 14 | 14 | 14 | A → B → C → D → A | 19,997421 | 0,011744 |
| 16 | 14 | 14 | 14 | A → D → C → B → A | 19,998711 | 0,005872 |
| 17 | 14 | 14 | 14 | A → B → C → D → A | 19,999355 | 0,002936 |
| 18 | 14 | 14 | 14 | A → D → C → B → A | 19,999678 | 0,001468 |
| 19 | 14 | 14 | 14 | A → B → C → D → A | 19,999839 | 0,000734 |
| 20 | 14 | 14 | 14 | A → B → C → D → A | 19,999919 | 0,000367 |
| 21 | 14 | 14 | 14 | A → D → C → B → A | 19,99996 | 0,000184 |
| 22 | 14 | 14 | 14 | A → D → C → B → A | 19,99998 | 9,175e-5 |
| 23 | 14 | 14 | 14 | A → B → C → D → A | 19,99999 | 4,588e-5 |
| 24 | 14 | 14 | 14 | A → B → C → D → A | 19,999995 | 2,294e-5 |
| 25 | 14 | 14 | 14 | A → B → C → D → A | 19,999997 | 1,147e-5 |
| 26 | 14 | 14 | 14 | A → B → C → D → A | 19,999999 | 5,734e-6 |
| 27 | 14 | 14 | 14 | A → B → C → D → A | 19,999999 | 2,867e-6 |
| 28 | 14 | 14 | 14 | A → B → C → D → A | 20 | 1,434e-6 |
| 29 | 14 | 14 | 14 | A → D → C → B → A | 20 | 7,168e-7 |
| 30 | 14 | 14 | 14 | A → D → C → B → A | 20 | 3,584e-7 |

### Comparação β = 0 × β = 2 (seção 6.5)

| Semente | Melhor (β = 0) | Iteração (β = 0) | Melhor (β = 2) | Iteração (β = 2) |
|---|---|---|---|---|
| 1 | 14 | 1 | 14 | 1 |
| 2 | 14 | 1 | 14 | 1 |
| 3 | 14 | 1 | 14 | 1 |
| 4 | 14 | 1 | 14 | 1 |
| 5 | 14 | 1 | 14 | 1 |
| **Média** | **14** | 1 | **14** | 1 |
| **Atingiram 14** | **5/5** | | **5/5** | |

Média das distâncias das formigas na iteração 30: β = 0 → 15,56; β = 2 → 14.

### Análise e conclusão

**6.1.** As distâncias e os seis comprimentos coincidem com o enunciado. As 300 rotas construídas na execução 6.4 são válidas e só assumem os valores 14, 16 e 18; rotas incompletas, com repetição ou sem retorno são rejeitadas pela verificação.

**6.2.** As probabilidades em A (0,520156; 0,187256; 0,292588) e em B (0,609756; 0,390244) batem com os valores esperados, somam 1, e A e B ficam fora do sorteio depois de visitados. Com α = β = 0 as probabilidades ficam iguais mesmo com feromônios e distâncias diferentes, e o último candidato recebe p = 1. A roleta escolhe C e D quando o número sorteado cai nas faixas deles, e a frequência em 100.000 sorteios reproduz as probabilidades, o que mostra que o sorteio é proporcional e não escolhe sempre o maior peso.

**6.3.** Evaporação e depósito produzem exatamente 1,5 e 0,5 na primeira iteração, 1,75 e 0,25 na segunda, e 2,5 e 0,5 com duas formigas, o que confirma a soma dos depósitos e que nada é atualizado durante a construção das rotas. O log das arestas AB e AC sai no formato pedido. A matriz permanece simétrica, a diagonal fica em 0 e o piso de 10⁻¹² só atua quando o valor ficaria numericamente nulo.

**6.4.** A melhor rota acumulada foi A → D → C → B → A, com comprimento 14 (ótimo), encontrada já na iteração 1. Há 30 registros, a melhor distância acumulada nunca aumenta e a iteração 0 mostra "ainda não calculada". A média das formigas cai de 14,8 para 14 a partir da iteração 8: toda a colônia passa a percorrer o perímetro (nos dois sentidos, que são a mesma rota). O feromônio do perímetro converge para 20, que é o equilíbrio esperado: cada uma das 10 formigas deposita Q/L = 14/14 = 1, e τ = (1 − 0,5)·τ + 10 resulta em τ = 20. As diagonais caem pela metade a cada iteração até valores da ordem de 10⁻⁷. Repetir a execução, reiniciar, pausar na iteração 12 e retomar, ou avançar iteração a iteração produzem o mesmo histórico e a mesma matriz de feromônio. Também foi verificado que, em cada iteração, todas as probabilidades usadas pelas formigas correspondem à matriz τ do início da iteração.

**6.5.** Nesta instância, β = 0 e β = 2 tiveram o mesmo resultado final: média da melhor distância 14 e 5 de 5 execuções atingindo 14, todas já na primeira iteração. Isso é esperado, porque há só três ciclos distintos e uma formiga sem nenhuma heurística já encontra o ótimo com probabilidade 1/3; com 10 formigas por iteração, a chance de nenhuma encontrá-lo na primeira iteração é (2/3)¹⁰ ≈ 1,7%. A diferença aparece no comportamento da colônia: na iteração 30, a média das distâncias das formigas foi 15,56 com β = 0 e 14 com β = 2. Sem a informação de distância, a escolha depende só do feromônio e a colônia continua explorando rotas piores; com β = 2, as arestas curtas recebem peso maior e a colônia converge para o ótimo. As entradas inválidas (coordenadas duplicadas, identificadores repetidos, menos de 4 ou mais de 12 vértices, campos vazios e valores fora das faixas) são bloqueadas com mensagens que indicam o campo e o motivo, e na interface os botões Executar e Avançar ficam desabilitados. Com ρ = 0% nenhuma aresta perdeu feromônio em 30 iterações; só os depósitos alteraram os valores.

**Cenário inicial (8 vértices, semente 42).** A execução padrão encontra A → C → D → F → E → G → B → H → A, com comprimento 2.927,7707, na iteração 9. Uma busca exaustiva das 5.040 rotas possíveis confirmou que esse é o ótimo do cenário.

### Verificações na interface

Feitas na própria página, com a instância 6.1 e os parâmetros da 6.4 (semente 42):

| Verificação | Resultado |
|---|---|
| Executar direto com intervalo de 0 ms | 30 iterações + linha da iteração 0; iteração 1: menor 14, média 14,8, rota A → D → C → B → A; melhor final 14 |
| Executar com intervalo de 150 ms, pausar na iteração 5, mudar o intervalo para 0 ms e retomar | Histórico idêntico ao da execução direta |
| Usar apenas "Avançar uma iteração" 30 vezes | Histórico idêntico ao da execução direta |
| Comparação com o Node | Mesmos valores da tabela da seção 6.4 acima |
| Mudança de escala visual | Avisada nas iterações 1 (referência 1 → 10) e 2 (10 → 20); depois a escala ficou estável |
| Adicionar até 12 vértices | Botão "Adicionar vértice" desabilitado com 12; remoção desabilitada com 4 |
| Remover o vértice que era o depósito | O depósito passa para o primeiro vértice da lista |
| Apagar o campo Q | Mensagem "Constante de depósito (Q): campo vazio." e botão Executar bloqueado |
