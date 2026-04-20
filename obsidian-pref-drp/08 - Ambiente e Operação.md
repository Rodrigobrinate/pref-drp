# Ambiente e Operação

## Variáveis de ambiente principais

### Banco

- `DATABASE_URL`
- `DIRECT_URL`

### Supabase

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

### Console admin

- `DEVELOPER_ACCESS_CPFS`

## Scripts NPM

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:seed`

## Infra observada

- `Dockerfile`
- `docker-compose.yaml`
- workflow GitHub para imagem Docker em `.github/workflows/docker-image.yml`

## Dependências externas

- banco PostgreSQL
- Supabase Storage
- browser com suporte ao App Router

## Seed e setup de banco

O repositório contém:

- `prisma/schema.prisma`
- `prisma/seed.js`

O fluxo esperado de setup é:

1. configurar `.env`
2. gerar client Prisma
3. aplicar schema ao banco
4. executar seed se necessário
5. iniciar a aplicação

## Parsing de importação

### XML operacional do ciclo

`lib/xml.ts` espera encontrar registros com, no mínimo:

- CPF
- matrícula

E tenta inferir:

- nome
- vínculo
- secretaria
- cargo
- CPF da chefia

### Importador admin XML/CSV

`lib/admin-import.ts` usa aliases configuráveis em `lib/admin-import-config.ts` para reconhecer cabeçalhos variáveis.
