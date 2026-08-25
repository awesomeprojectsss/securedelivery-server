# Guia de Desenvolvimento — SecureDelivery Server

## Objetivo

Este documento orienta desenvolvedores humanos a trabalhar no backend do SecureDelivery de forma consistente, segura e sustentável.

Antes de desenvolver, leia:

1. `../docs/project.md`
2. `AGENTS.md`
3. `docs/architecture.md`
4. ADRs relevantes em `docs/decisions/`
5. `docs/git-workflow.pt-BR.md`

## Stack oficial

- NestJS
- TypeScript
- PostgreSQL
- Redis
- BullMQ
- WebSocket
- Docker
- Docker Compose

O backend começa como um **monólito modular**.

Redis e BullMQ fazem parte do MVP, mas isso não significa que toda operação deve usar cache ou fila.

## Princípios

- O backend é a fonte de verdade do sistema.
- Segurança e autorização são responsabilidades do servidor.
- Toda escrita que possa sofrer retry deve considerar idempotência.
- Dados históricos importantes não devem ser apagados sem regra explícita.
- Simplicidade e clareza têm prioridade sobre abstrações prematuras.
- Prefira soluções idiomáticas do NestJS.
- Não crie microserviços antes de existir necessidade real.

## Organização do código

Prefira módulos por domínio/funcionalidade.

Exemplos:

```text
src/
  auth/
  users/
  customers/
  smartboxes/
  deliveries/
  telemetry/
  events/
  support/
  realtime/
  jobs/
```

A estrutura final deve seguir o que estiver definido em `docs/architecture.md`.

### Controllers

Controllers devem:

- receber requisições;
- acionar validações e guards;
- chamar serviços/casos de uso;
- mapear respostas.

Controllers não devem conter regra de negócio.

### Services / casos de uso

Devem concentrar comportamento de aplicação e orquestração.

Evite `Service` gigantesco com responsabilidades de vários domínios.

### DTOs

Use DTOs explícitos para entradas e saídas públicas.

Valide dados externos.

Não exponha diretamente entidades de persistência como contrato HTTP.

## Banco de dados

- Toda alteração de schema deve ter migration.
- Não faça alteração manual de produção que não esteja documentada/migrada.
- Use `UNIQUE`, `FOREIGN KEY`, `NOT NULL` e outras constraints para proteger invariantes.
- Considere índices para consultas reais, não por especulação.
- Paginar listas potencialmente grandes.
- Evitar carregar grandes volumes de telemetria/eventos em memória.
- Cuidado com N+1 queries.
- Use transações quando várias gravações precisarem ser atômicas.

## Contratos entre repositórios

Antes de implementar endpoint consumido por Mobile ou Dashboard, consulte os contratos na raiz do workspace:

```text
docs/contracts/
```

Regras:

- `Device` é o termo técnico.
- `SmartBox` é apenas o nome mostrado na interface.
- rotas usam `/devices`;
- sensores usam observações genéricas `key/value/unit`;
- `eventType` é string namespaced aberta;
- evento desconhecido válido não deve ser rejeitado;
- sensor desconhecido válido não deve ser rejeitado.

O backend deve entender o envelope, e não cada sensor.

Exemplo:

```json
{
  "key": "motion.acceleration.x",
  "value": 0.18,
  "unit": "m/s2"
}
```

Evite criar no contrato compartilhado campos como:

```text
accelerometerX
accelerometerY
temperature
humidity
```

A ingestão deve separar:

1. validação do envelope;
2. idempotência;
3. persistência genérica;
4. processamento especializado opcional.

## Telemetria enxuta e velocidade

O backend não deve funcionar como historian da IMU bruta normal.

Receber normalmente:

- resumo de 1 minuto;
- bateria/conectividade/status;
- última localização válida;
- distância percorrida;
- tempo em movimento;
- tempo parado;
- velocidade máxima.

A IMU de 50 Hz permanece no Device e chega ao servidor principalmente como evidência de evento.

Velocidade média em movimento:

```text
sum(distância) / sum(tempo em movimento)
```

Nunca calcular pela média aritmética das médias de cada período.

Eventos podem trazer velocidade no instante e janelas anteriores como atributos genéricos.

Métricas desconhecidas válidas continuam aceitas pelo contrato extensível.

## Idempotência

No SecureDelivery isso é requisito central.

Exemplos:

- `batchId`
- `eventId`

Se o mobile reenviar um batch porque perdeu o ACK, o servidor deve reconhecer o mesmo identificador e não duplicar o registro lógico.

Proteja isso também no banco quando possível.

## Redis

Use para:

- BullMQ;
- cache justificado;
- coordenação temporária;
- suporte a realtime quando necessário.

Não use Redis como única cópia de dados de negócio.

## BullMQ

Use fila quando houver benefício real de processamento assíncrono.

Bons candidatos:

- pós-processamento de eventos;
- alertas;
- notificações;
- KPIs;
- trabalhos retryable.

Regras:

- jobs retryable devem ser idempotentes;
- não assumir execução única;
- payloads devem ser pequenos;
- falhas precisam ter contexto suficiente para investigação;
- não esconder fluxo transacional importante dentro de filas.

## WebSocket

WebSocket serve para tempo real.

Não é persistência.

Exemplos:

- eventos novos;
- saúde de Device;
- tickets/chat;
- mudanças operacionais.

O cliente precisa conseguir recuperar estado correto via API após reconexão.

## RBAC

Roles:

```text
SUPER_ADMIN
ADMIN
CUSTOMER
```

Nunca confie no frontend para autorização.

Teste explicitamente:

- isolamento entre Customers;
- ações exclusivas de Super Admin;
- restrições de auto-inativação;
- acesso a Devicees, tickets, eventos e usuários.

## Logs e observabilidade

Use logs estruturados.

Inclua identificadores úteis quando existirem:

- requestId
- customerId
- deviceId
- deliveryId
- eventId
- batchId
- ticketId

Não registrar:

- senha;
- token;
- Authorization header;
- secrets;
- localização precisa sem necessidade operacional.

## Testes

Prioridade:

1. regras de domínio;
2. autorização;
3. isolamento multi-tenant;
4. idempotência;
5. persistência;
6. filas;
7. APIs críticas.

Tipos:

- unitários para regras isoladas;
- integração para banco/Redis/BullMQ;
- e2e para fluxos críticos.

## Dependências

Antes de adicionar uma dependência:

1. confirme se NestJS/Node já resolve;
2. verifique manutenção e compatibilidade;
3. avalie custo de segurança e longo prazo;
4. justifique no PR.

Mudanças arquiteturais importantes devem gerar ADR.

## Antes de abrir PR

Execute os comandos disponíveis no projeto para:

- instalar dependências;
- lint;
- format;
- typecheck;
- testes;
- build;
- migrations/testes de banco quando aplicável.

Use os scripts reais do `package.json`; não invente comandos se o projeto ainda não os definiu.

Consulte `docs/git-workflow.pt-BR.md` para o fluxo completo.
