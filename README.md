# Livro Caixa Simples (SaaS Edition)

Este projeto foi migrado de um aplicativo desktop (Tauri) para uma arquitetura SaaS rodando na AWS.

## Arquitetura

- **Frontend:** React (SPA) + Vite + Tailwind CSS (Hospedado no S3/CloudFront).
- **Backend:** Python (FastAPI) + AWS Lambda + API Gateway.
- **Autenticação:** Amazon Cognito (User Pools) com suporte a MFA (Email, SMS, TOTP).
- **Banco de Dados:** Amazon Aurora Serverless v2 (PostgreSQL).
- **Infraestrutura:** AWS CDK (Python).

## Estrutura do Projeto

- `/src`: Código fonte do Frontend (React).
- `/backend`: API FastAPI rodando em Python.
- `/infra`: Definições de infraestrutura usando AWS CDK.

## Como Executar Localmente

### Usando Docker (Recomendado)

A forma mais rápida de subir o ambiente completo (Frontend, Backend, DB e Roteamento) é usando Docker e Traefik:

1. Certifique-se de ter o Docker instalado.
2. Execute o comando:
   ```bash
   docker compose up --build
   ```
3. Acesse nos seguintes endereços:
   - **Frontend:** [http://app.localhost](http://app.localhost)
   - **API (Swagger):** [http://api.localhost/docs](http://api.localhost/docs)
   - **Traefik Dashboard:** [http://localhost:8080](http://localhost:8080)

### Execução Manual
1. Navegue até `/backend`.
2. Crie um ambiente virtual: `python -m venv .venv`.
3. Instale as dependências: `pip install -r requirements.txt`.
4. Execute: `uvicorn app.main:app --reload`.

### Frontend
1. Na raiz, instale as dependências: `npm install`.
2. Configure o arquivo `.env` com as variáveis do Cognito e da API (veja `.env.example`).
3. Execute: `npm run dev`.

## Deployment (MVP Mode)

O deploy é automatizado via GitHub Actions e disparado pela criação de uma nova tag de versão:

```bash
git tag v1.0.0
git push origin v1.0.0
```

---
**Nota:** O repositório deve ser mantido como **Privado**.
