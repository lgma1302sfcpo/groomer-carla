# Sistema Groomer Carla

Sistema web comercial inspirado no fluxo do Nex, construído com Next.js 15, TypeScript, TailwindCSS, Prisma, PostgreSQL e NextAuth.

## Arquitetura

O projeto segue Clean Architecture por módulo:

- `src/interfaces`: contratos que isolam casos de uso de detalhes de infraestrutura.
- `src/dtos`: tipos de entrada e saída usados pelas APIs e serviços.
- `src/schemas`: validações Zod reutilizadas por API e formulários.
- `src/services`: regras de aplicação e orquestração de casos de uso.
- `src/repositories`: implementações de persistência com Prisma.
- `src/lib`: clientes, helpers transversais, autenticação e autorização.
- `src/components`: componentes de UI e composição de telas.
- `src/hooks`: consultas e mutations do lado cliente.
- `src/contexts`: provedores de sessão, query client e recursos globais.
- `src/stores`: estados locais com Zustand.

## Módulo 1: Identity

Inclui login, cadastro de empresa, recuperação de senha, multiempresa, usuários, cargos e permissões. O módulo cria a base de segurança que os demais módulos usarão.

## Comissão de banho e tosa

Na agenda, abra **Serviços e profissionais**, selecione ou cadastre um profissional e confira a **Comissão (%)**. O padrão é **30% sobre o valor dos serviços** para cada profissional, com possibilidade de ajuste entre 0 e 100 e até duas casas decimais.

A comissão é calculada sobre o valor informado no novo agendamento, inclusive em atendimentos de pacote, e arredondada para centavos. A prévia aparece ao agendar; os valores registrados aparecem no atendimento, no total do profissional e no total previsto do dia. Cancelamentos e faltas não entram nos totais.

O percentual vigente no cadastro é aplicado ao criar o agendamento. Alterar esse percentual ou reagendar o horário mantém as comissões já registradas, inclusive os valores zero anteriores à ativação do recurso. A migração `20261026010000_grooming_default_commission` define 30% para todos os profissionais já cadastrados e para novos registros, preservando as comissões dos agendamentos anteriores. Ela é aplicada pelo fluxo de deploy do projeto. Os totais são uma previsão da agenda, sem gerar pagamentos ou despesas automaticamente.

## Execução local

```bash
cp .env.example .env
npm install
npm run db:local:start
```

Em outro terminal:

```bash
npm run prisma:generate
npm run db:local:setup
npm run dev
```

Se preferir usar Docker, suba o PostgreSQL com `docker compose up -d` e ajuste `DATABASE_URL` para a porta correspondente.

## Scripts

- `npm run dev`: servidor local.
- `npm run build`: build de produção.
- `npm run lint`: ESLint.
- `npm run typecheck`: TypeScript sem emissão.
- `npm run test`: testes unitários.
- `npm run prisma:migrate`: cria/aplica migrations em desenvolvimento.
- `npm run prisma:deploy`: aplica migrations em produção.
- `npm run db:local:start`: inicia o PostgreSQL isolado do projeto em `.postgres-data` na porta `5434`.
- `npm run db:local:setup`: cria o banco local, aplica migrations e executa seed.
