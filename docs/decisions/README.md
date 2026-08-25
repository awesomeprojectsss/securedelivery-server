# Architecture Decision Records

Store meaningful architectural decisions in this directory using ADR files.

Accepted decisions must not be silently changed. If a decision is replaced, create a new ADR and mark the previous ADR as superseded.

## Relação com outros documentos

- `../architecture.md` descreve o estado atual da arquitetura.
- `../development-guide.pt-BR.md` orienta os desenvolvedores.
- `../git-workflow.pt-BR.md` define o fluxo de Git/GitHub.
- `../../AGENTS.md` orienta agentes de IA.

## ADRs compartilhados

Decisões que afetam mais de um repositório ficam na raiz do workspace:

```text
docs/decisions/
```

Em especial, `Device`, telemetria, eventos e frequência de sensores são decisões compartilhadas e não devem ser redefinidas localmente.
