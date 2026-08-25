# Fluxo Git e GitHub — SecureDelivery Server

## Objetivo

Este documento define o fluxo padrão de Git e GitHub para desenvolvimento do SecureDelivery.

A ideia central é simples:

> ninguém desenvolve diretamente em `develop` ou `main`.

Todo trabalho deve acontecer em branch isolada, passar por Pull Request, Code Review e validação antes do merge.

---

## Branches principais

### `main`

Representa a versão estável/aprovada.

Não desenvolver diretamente nela.

Não fazer merge direto de feature/bugfix/refactor/chore para `main`.

Promoções para `main` devem acontecer após integração e validação em `develop`.

### `develop`

É a branch de integração do desenvolvimento.

Features, correções e refactors entram em `develop` através de Pull Request.

`develop` deve permanecer utilizável e testável.

---

## Regra número 1: descobrir a branch mais atualizada

Antes de criar qualquer branch:

```bash
git status
git fetch --all --prune
```

Confira as branches remotas:

```bash
git branch -a
```

Atualize sua visão local:

```bash
git switch develop
git pull --ff-only origin develop
```

Quando houver dúvida sobre qual branch é a base correta, verifique o GitHub e compare `main` e `develop`.

Normalmente o trabalho novo parte da `develop`.

Nunca crie uma feature a partir de uma branch local desatualizada sem verificar o remoto.

---

## Branch isolada para todo trabalho

Crie uma branch para cada unidade lógica de trabalho.

Padrões recomendados:

```text
feature/<descricao>
bugfix/<descricao>
refactor/<descricao>
chore/<descricao>
docs/<descricao>
test/<descricao>
hotfix/<descricao>
spike/<descricao>
draft/<descricao>
```

Exemplos:

```text
feature/smartbox-activation
bugfix/duplicate-telemetry
refactor/event-processing
chore/update-dependencies
docs/update-architecture
test/rbac-e2e
draft/support-chat
```

Prefira nomes:

- curtos;
- em inglês;
- kebab-case;
- relacionados ao objetivo.

---

## Criando uma branch

Partindo da `develop` atualizada:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/smartbox-activation
```

Publique:

```bash
git push -u origin feature/smartbox-activation
```

---

## Durante o desenvolvimento

Verifique frequentemente:

```bash
git status
git diff
```

Faça commits pequenos e coerentes.

Use Conventional Commits.

Exemplos:

```text
feat(smartboxes): add activation token validation
fix(telemetry): prevent duplicate batch persistence
refactor(events): isolate detection evidence mapper
test(auth): add customer isolation coverage
docs: update architecture
chore: update dependencies
```

Evite um único commit gigantesco com várias mudanças sem relação.

---

## Antes de abrir o Pull Request

Atualize referências remotas:

```bash
git fetch origin --prune
```

Verifique se `develop` recebeu mudanças novas.

Uma estratégia segura é atualizar sua branch com a `develop` antes do PR.

Se a equipe optar por rebase:

```bash
git rebase origin/develop
```

Resolva conflitos e rode todos os testes novamente.

Se a equipe preferir merge da `develop` na feature:

```bash
git merge origin/develop
```

Não misture estratégias sem alinhamento.

A política de rebase/merge deve ser consistente no time.

---

## Validação técnica antes do PR

Execute os scripts reais definidos no projeto. Em um backend NestJS, normalmente isso inclui algo equivalente a:

```bash
npm install
npm run lint
npm run test
npm run test:e2e
npm run build
```

Quando houver migrations, banco, Redis ou BullMQ envolvidos, execute também os testes de integração relevantes.

Use o package manager e scripts definidos pelo repositório/lockfile; não troque por preferência pessoal.

Além disso:

- confira arquivos não desejados;
- não envie `.env`;
- não envie secrets;
- revise migrations;
- revise documentação alterada;
- confirme que nenhuma feature fora do escopo entrou por acidente.

---

## Abrindo Pull Request para `develop`

No GitHub:

```text
base: develop
compare: sua-branch
```

O PR deve ter:

- título claro;
- descrição do problema;
- descrição da solução;
- como testar;
- riscos;
- screenshots quando houver UI;
- migrations/configuração quando houver;
- ADR/documentação atualizada quando necessário.

Use Draft PR quando o trabalho ainda estiver em andamento e você quiser visibilidade/revisão antecipada.

Draft não significa que código quebrado pode ser integrado.

---

## Code Review

O autor do código não deve fazer merge do próprio PR quando houver reviewer disponível e o processo do time exigir revisão independente.

O reviewer deve verificar:

- aderência ao requisito;
- legibilidade;
- arquitetura;
- segurança;
- testes;
- edge cases;
- regressões;
- documentação;
- escopo.

Comentários importantes devem ser resolvidos antes do merge.

Após alterações pedidas:

```bash
git add .
git commit -m "fix(scope): address review feedback"
git push
```

Se houver squash configurado no GitHub, commits de correção podem ser consolidados no merge.

---

## Merge em `develop`

Depois de:

- aprovação do Code Review;
- checks automáticos verdes;
- conflitos resolvidos;

o reviewer ou responsável autorizado faz o merge na `develop`.

Preferência de estratégia de merge deve ser definida pelo time/repositório.

Não faça merge com CI quebrada sem decisão explícita e justificada.

---

## Após merge em `develop`

A mudança entra no ambiente de integração/testes.

Fluxo:

```text
Branch isolada
    ↓
Pull Request
    ↓
Code Review
    ↓
Merge em develop
    ↓
Build/Deploy de testes
    ↓
Testes
    ↓
Validação
```

Se encontrar problema:

1. abra issue/bug;
2. crie nova `bugfix/...` baseada na `develop` atualizada;
3. corrija;
4. abra novo PR para `develop`;
5. repita review e testes.

Evite "consertar direto na develop".

---

## Promoção para `main`

Depois que o conjunto de alterações em `develop` estiver validado:

```text
develop
   ↓
PR
   ↓
main
```

Abra Pull Request:

```text
base: main
compare: develop
```

Esse PR representa promoção/release, não desenvolvimento de feature.

Antes do merge:

- CI verde;
- testes aprovados;
- validação funcional concluída;
- migrations revisadas;
- changelog/release notes quando aplicável;
- versão/tag quando aplicável.

Após aprovação, o responsável faz merge na `main`.

---

## Tags e releases

Quando houver release versionada:

```bash
git switch main
git pull --ff-only origin main
git tag -a v0.1.0 -m "SecureDelivery v0.1.0"
git push origin v0.1.0
```

Use SemVer quando o projeto estiver adotando versionamento formal:

```text
MAJOR.MINOR.PATCH
```

---

## Hotfix

Hotfix é reservado para problema urgente em produção.

Fluxo sugerido:

```text
main
 ↓
hotfix/descricao
 ↓
PR para main
 ↓
release
 ↓
sincronizar correção de volta para develop
```

Depois do hotfix em `main`, garanta que `develop` receba a mesma correção para evitar regressão futura.

Hotfix não deve virar caminho normal para desenvolvimento.

---

## Excluindo branch após merge

Depois do merge:

```bash
git switch develop
git pull --ff-only origin develop
git branch -d feature/smartbox-activation
```

Se a branch remota não tiver sido removida automaticamente:

```bash
git push origin --delete feature/smartbox-activation
```

Depois:

```bash
git fetch --prune
```

---

## Não fazer

Evite:

```text
git push --force em branch compartilhada
git reset --hard sem entender o impacto
commitar .env
commitar secrets
desenvolver direto em main
desenvolver direto em develop
merge de feature direto em main
PR enorme com múltiplos assuntos
resolver conflito escolhendo "ours/theirs" sem revisar
ignorar CI quebrada
```

Se precisar reescrever histórico da sua própria branch publicada, prefira:

```bash
git push --force-with-lease
```

e somente quando souber que ninguém mais depende dela.

---

## Fluxo resumido

```text
1. git fetch
2. atualizar develop
3. criar branch isolada
4. desenvolver
5. testar localmente
6. atualizar com develop
7. push
8. abrir PR -> develop
9. Code Review
10. corrigir feedback
11. checks verdes
12. reviewer faz merge
13. testar develop
14. corrigir via nova branch se necessário
15. PR develop -> main após validação
16. aprovação
17. merge na main
18. tag/release quando aplicável
```

---

## Mudanças de contrato entre repositórios

Uma mudança em `docs/contracts/` na raiz do workspace é uma mudança cross-repository.

Antes do PR:

1. identificar consumidores afetados;
2. atualizar o contrato canônico;
3. avaliar backward compatibility;
4. atualizar o backend;
5. atualizar/regenerar clientes;
6. abrir PRs coordenados nos repositórios afetados;
7. explicar ordem segura de merge/deploy no PR.

O PR deve informar explicitamente:

```text
Contract change: yes/no
Affected repositories:
Breaking change: yes/no
Required deployment order:
```

Evite fazer merge de uma mudança incompatível em `develop` sem que os consumidores tenham uma estratégia compatível.

## GitHub

Use o GitHub como fonte de colaboração para:

- Pull Requests;
- Code Review;
- Issues;
- Draft PRs;
- Actions/CI;
- releases;
- documentação de mudanças.

Toda decisão importante discutida em chat deve, quando relevante, terminar registrada em:

- Issue;
- PR;
- ADR;
- documentação;

para que o histórico do projeto não dependa apenas de conversas externas.
