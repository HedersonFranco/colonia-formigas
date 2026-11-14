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
