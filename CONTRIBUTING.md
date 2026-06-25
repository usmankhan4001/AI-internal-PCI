# Contributing to PCI WhatsApp Bot V2

First off, thank you for considering contributing to the PCI WhatsApp Bot V2!

## Development Environment Setup

1. **Clone the repository** and navigate to the `bot-v2` directory.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in the required credentials.
   ```bash
   cp .env.example .env
   ```

## Database Initialization
This project uses **Prisma** with PostgreSQL and the `pgvector` extension for semantic search.

1. Ensure your PostgreSQL instance has `pgvector` installed.
2. Push the schema to the database:
   ```bash
   npx prisma db push
   ```
3. Generate the Prisma Client:
   ```bash
   npx prisma generate
   ```

## Seeding the Knowledge Base
To seed the AI's knowledge base with documents:
1. Place PDF files in the `/knowledge_base` root folder.
2. Extract text and generate JSON files:
   ```bash
   python extract_pdfs.py
   ```
3. Seed the vectors into PostgreSQL:
   ```bash
   npx ts-node seed_knowledge.ts
   ```

## Running the Application

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run build
npm run start:prod
```

## Pull Request Guidelines
1. Create a feature branch from `main`.
2. Ensure your code compiles without TypeScript errors (`npm run build`).
3. Submit a PR outlining the architectural changes and testing steps.
