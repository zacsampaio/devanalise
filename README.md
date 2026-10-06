# Painel de Entregas

Dashboard das suas entregas montado a partir dos **seus commits no GitHub** e dos **chamados do Jira** citados nas mensagens. Os commits são agrupados por chamado (ex.: `ABC-123`) em *demandas*; do Jira vêm o título, o tipo, a prioridade e o status.

- [Páginas](#páginas)
- [Dois modos: local ou hospedado](#dois-modos-local-ou-hospedado)
- [Início rápido](#início-rápido)
- [1. Token do GitHub](#1-token-do-github-obrigatório)
- [2. Token do Jira](#2-token-do-jira-opcional)
- [3. Senha do painel](#3-senha-do-painel)
- [Publicar na Vercel (modo hospedado)](#publicar-na-vercel-modo-hospedado)
- [Referência do `.env`](#referência-do-env)
- [Como os commits viram demandas](#como-os-commits-viram-demandas)
- [Atualização dos dados](#atualização-dos-dados)
- [Segurança](#segurança)
- [Problemas comuns](#problemas-comuns)

## Páginas

| Rota | O que mostra |
|---|---|
| `/` | Números do período, entregas mês a mês, frentes, contas/organizações, destaques e últimas entregas |
| `/dashboard` | Painel de acompanhamento com recorte de 30 dias, 90 dias ou tudo |
| `/demandas` | Todas as demandas com filtros (tipo, sistema, impacto, busca). Aceita filtros na URL: `?impacto=alto`, `?tipo=correcao`, `?q=webhook` |
| `/demandas/<chamado>` | Uma demanda: chamado no Jira, período, linha do tempo dos commits e arquivos mais alterados |
| `/sistemas` e `/sistemas/<repo>` | Repositórios agrupados pelo dono e o histórico de cada um |

## Dois modos: local ou hospedado

| | Local | Hospedado |
|---|---|---|
| Para quem | Você, na sua máquina ou no seu servidor | Qualquer pessoa, num endereço público (ex.: Vercel) |
| Login no GitHub | Token seu no `.env` (`GITHUB_TOKEN`) | Cada pessoa entra com a própria conta (GitHub App, só leitura) |
| Jira | Token no `.env` (`JIRA_*`) | Cada pessoa conecta a própria conta Atlassian (OAuth) |
| Proteção | Senha HTTP Basic (`PAINEL_SENHA`) | O próprio login do GitHub |
| Onde ficam os dados | `data/ultima-coleta.json`, no servidor | Só na aba do navegador da pessoa. O servidor não guarda nada |

O modo é escolhido sozinho: com `GITHUB_CLIENT_ID` definido, o painel roda hospedado. Sem ele, roda local. O resto deste README até "Publicar na Vercel" trata do modo local.

## Início rápido

Requisitos: Node.js 20 ou mais novo.

```bash
npm install
cp .env.example .env     # no Windows (PowerShell): Copy-Item .env.example .env
```

Abra o `.env` e preencha, seguindo as seções abaixo:

1. `GITHUB_TOKEN` (obrigatório)
2. `JIRA_URL`, `JIRA_EMAIL` e `JIRA_API_TOKEN` (opcional, mas recomendado)
3. `PAINEL_SENHA` (obrigatório para rodar em produção)

Depois:

```bash
npm run testar   # confere o acesso ao GitHub e ao Jira (não mostra os tokens)
npm run build
npm start        # http://localhost:3000 — usuário "admin" e a senha do .env
```

Para desenvolver: `npm run dev` (em desenvolvimento a senha é opcional).

Testes automáticos: `npm test` (uma vez) ou `npm run test:watch` (reexecuta ao salvar). Ficam em `testes/`, não usam rede nem os tokens do `.env` e cobrem a extração de chamados, a classificação das demandas, o modelo, os indicadores do dashboard, os filtros de repositório, a coleta incremental, a autenticação do painel e a sessão do modo hospedado (cookies criptografados, proxy e state do OAuth).

## 1. Token do GitHub (obrigatório)

O painel mostra os commits **de quem é dono do token**. Use um token da sua própria conta. Há dois tipos; escolha um.

### Opção A — Token *classic* (mais simples, cobre todas as organizações)

1. No GitHub, clique na sua foto → **Settings**.
2. No menu da esquerda, no fim: **Developer settings**.
3. **Personal access tokens** → **Tokens (classic)** → **Generate new token** → **Generate new token (classic)**.
4. Preencha:
   - **Note**: um nome, ex.: `painel-entregas`.
   - **Expiration**: 90 dias, por exemplo. Evite "No expiration".
   - **Scopes**: marque **`repo`**, para ler os repositórios privados, e **`read:org`**, para enxergar os repositórios das organizações das quais você é membro.
5. Clique em **Generate token** e **copie o token na hora** (começa com `ghp_`). O GitHub não mostra de novo.
6. Cole no `.env`:

   ```env
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
   ```

> O escopo `repo` do token classic dá leitura **e escrita**: o GitHub não tem escopo só de leitura para repositórios privados nesse tipo. O painel só lê, mas guarde o token com cuidado. Se quiser só leitura, use a opção B.

### Opção B — Token *fine-grained* (só leitura, um dono por token)

1. **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Preencha:
   - **Token name** e **Expiration**.
   - **Resource owner**: sua conta *ou* a organização cujos repositórios você quer ver. O token fine-grained enxerga **um dono só**. Se o seu trabalho está em mais de uma organização, use o token classic.
   - **Repository access**: **All repositories**.
   - **Permissions → Repository permissions**:
     - **Contents**: `Read-only`
     - **Metadata**: `Read-only` (vem marcado automaticamente)
3. **Generate token** e copie (começa com `github_pat_`).
4. Se o dono for uma organização, ela pode precisar **aprovar** o token. Até lá, ele aparece como *pending*.

### Organizações com SSO (SAML)

Se a organização usa login corporativo, autorize o token nela. Em **Settings → Developer settings → Personal access tokens**, ao lado do token, use **Configure SSO** → **Authorize** na organização. Sem isso, os repositórios dela não aparecem.

### Filtros opcionais

```env
# só repositórios destes donos (usuários ou organizações)
GITHUB_OWNERS=minha-empresa,meu-usuario
# repositórios que não entram ("dono/nome" ou só "nome")
GITHUB_IGNORAR=minha-empresa/sandbox,dotfiles
# início do período (ISO 8601). Vazio = últimos 12 meses
PAINEL_DESDE=2026-01-01T00:00:00Z
```

> Para o commit contar como seu, o e-mail usado no git (`git config user.email`) precisa estar cadastrado e verificado na sua conta do GitHub (**Settings → Emails**). Commits feitos com um e-mail que não está na conta não aparecem.

## 2. Token do Jira (opcional)

Sem Jira, o painel funciona: título, tipo e impacto saem das mensagens dos commits. Com Jira, eles vêm do chamado e aparecem o status e o link da issue.

1. Acesse **<https://id.atlassian.com/manage-profile/security/api-tokens>**, logado com a conta que você usa no Jira.
2. Clique em **Create API token**. Use o token comum, **não** o "with scopes": o painel chama o Jira pelo endereço do site, e tokens com escopo só funcionam pelo gateway `api.atlassian.com`.
3. Dê um nome (ex.: `painel-entregas`), escolha a validade e clique em **Create**.
4. **Copie o token** (ele não é mostrado de novo).
5. Preencha no `.env`:

   ```env
   # endereço do seu Jira: o que aparece no navegador, sem caminho no final
   JIRA_URL=https://sua-empresa.atlassian.net
   # o e-mail da SUA conta Atlassian (o mesmo do login)
   JIRA_EMAIL=voce@empresa.com
   JIRA_API_TOKEN=ATATT3xFfGF0...
   # opcional: só chaves destes projetos contam como chamado
   JIRA_PROJETOS=ABC,XYZ
   ```

O token tem as **mesmas permissões que você** no Jira: o painel só enxerga as issues que você pode abrir. Ele apenas lê, nunca altera chamados. A `JIRA_URL` precisa ser `https://`, senão o painel não envia o token.

Para os commits caírem na demanda certa, **cite a chave do chamado na mensagem**:

```text
ABC-123 feat: integra webhook de pagamentos
fix(ABC-140): corrige cálculo de frete
```

## 3. Senha do painel

O painel mostra dados de repositórios privados, então em produção (`npm start`) ele **exige login**. Sem `PAINEL_SENHA` configurada, ele responde *503 – Painel bloqueado*.

Gere uma senha forte:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

```env
PAINEL_USUARIO=admin
PAINEL_SENHA=cole-a-senha-gerada-aqui
```

O navegador pede usuário e senha na primeira visita.

- **Sirva sempre por HTTPS** em produção (por exemplo, atrás de um proxy reverso como Nginx, Caddy ou Cloudflare). O login usa HTTP Basic, que envia a senha a cada requisição.
- `PAINEL_PUBLICO=true` libera produção **sem** senha. Use só se o painel já estiver atrás de outro login (VPN, SSO do proxy etc.).

## Publicar na Vercel (modo hospedado)

Neste modo cada pessoa abre o endereço, clica em **Entrar com GitHub**, autoriza e vê os próprios commits. Se quiser, conecta o Jira também. **Sair** apaga tudo.

Como funciona:

- O login fica num cookie criptografado (AES-256-GCM, httpOnly) no navegador da pessoa e vale até 8 horas. Depois disso, ela entra de novo.
- A coleta é feita pelo navegador, um repositório por vez, por rotas curtas do painel (`/api/coleta/*`). Elas usam o token do cookie, consultam o GitHub ou o Jira e devolvem a resposta sem guardar nada. O token nunca chega ao JavaScript da página.
- Os commits coletados ficam só na aba (memória e `sessionStorage`). Fechar a aba ou sair apaga tudo. Entrar de novo recoleta, o que leva de segundos a alguns minutos, conforme a quantidade de repositórios.
- Não há banco de dados. Não é preciso configurar armazenamento na Vercel.

### 1. Crie o GitHub App

1. No GitHub: foto → **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**. Para o app ficar na sua organização, crie-o nas configurações dela.
2. Preencha:
   - **GitHub App name**: ex.: `painel-entregas`.
   - **Homepage URL**: o endereço do painel, ex.: `https://painel-entregas.vercel.app`.
   - **Callback URL**: `https://SEU-ENDERECO/api/auth/github/callback`.
   - Deixe marcado **Expire user authorization tokens**.
   - **Webhook**: desmarque **Active**.
   - **Permissions → Repository permissions**: **Contents** `Read-only` e **Metadata** `Read-only`. Nada mais.
   - **Where can this GitHub App be installed?**: **Any account**, para outras pessoas poderem usar.
3. **Create GitHub App**. Na página do app, copie o **Client ID** e clique em **Generate a new client secret**.

> O app só enxerga repositórios de contas e organizações onde ele está **instalado** (página do app → **Install App**). Cada pessoa instala na própria conta. Em organizações, um admin instala ou aprova. Sem isso, os repositórios da organização não aparecem.

### 2. (Opcional) Crie o app da Atlassian, para o botão "Conectar Jira"

1. Em **<https://developer.atlassian.com/console/myapps/>** → **Create** → **OAuth 2.0 integration**.
2. **Permissions** → **Jira API** → **Add** → **Configure** → adicione o escopo **`read:jira-work`**.
3. **Authorization** → **OAuth 2.0 (3LO)** → **Callback URL**: `https://SEU-ENDERECO/api/auth/atlassian/callback`.
4. **Settings**: copie o **Client ID** e o **Secret**.
5. **Distribution**: enquanto estiver *Not sharing*, só a sua conta Atlassian consegue conectar. Para outras pessoas, mude para **Sharing** e preencha o que a Atlassian pede (política de privacidade, dados pessoais).

Se a conta tiver acesso a mais de um site do Jira, o painel pergunta qual usar.

### 3. Publique

1. Suba o projeto para o GitHub e importe na Vercel (**Add New → Project**). As configurações padrão de Next.js servem.
2. Em **Settings → Environment Variables**, defina:

   | Variável | Valor |
   |---|---|
   | `GITHUB_CLIENT_ID` | Client ID do GitHub App |
   | `GITHUB_CLIENT_SECRET` | Client secret do GitHub App |
   | `SESSAO_SEGREDO` | 32+ caracteres aleatórios: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
   | `ATLASSIAN_CLIENT_ID` / `ATLASSIAN_CLIENT_SECRET` | Opcional, do app da Atlassian |
   | `PAINEL_URL` | Opcional: o endereço público, se o painel tiver mais de um domínio |

   **Não** defina `GITHUB_TOKEN`, `JIRA_*` nem `PAINEL_SENHA` lá: são do modo local.
3. **Deploy**. Abra o endereço e entre com o GitHub.

Trocar o `SESSAO_SEGREDO` desconecta todo mundo, porque os cookies antigos deixam de abrir. Isso é útil se ele vazar.

Para testar o modo hospedado na sua máquina, crie um segundo GitHub App com a Callback URL `http://localhost:3000/api/auth/github/callback` e preencha as mesmas variáveis no `.env`.

## Referência do `.env`

| Variável | Obrigatória | Padrão | Para que serve |
|---|---|---|---|
| `GITHUB_TOKEN` | sim | — | Token da sua conta no GitHub ([como emitir](#1-token-do-github-obrigatório)) |
| `GITHUB_OWNERS` | não | todos | Donos (usuários/orgs) cujos repositórios entram, separados por vírgula |
| `GITHUB_IGNORAR` | não | — | Repositórios que não entram (`dono/nome` ou `nome`) |
| `JIRA_URL` | não | — | Endereço do Jira Cloud, `https://…atlassian.net` |
| `JIRA_EMAIL` | não | — | E-mail da sua conta Atlassian |
| `JIRA_API_TOKEN` | não | — | API token do Jira ([como emitir](#2-token-do-jira-opcional)) |
| `JIRA_PROJETOS` | não | qualquer sigla | Chaves de projeto aceitas como chamado (`ABC,XYZ`); também aceita minúsculas (`abc-12`) |
| `PAINEL_DESDE` | não | últimos 12 meses | Início do período (ISO 8601) |
| `PAINEL_INTERVALO` | não | `300` | Segundos entre consultas ao GitHub/Jira |
| `PAINEL_FONTE` | não | — | `arquivo` usa só a última coleta salva, sem chamar as APIs |
| `PAINEL_USUARIO` | não | `admin` | Usuário do login do painel |
| `PAINEL_SENHA` | em produção | — | Senha do login do painel |
| `PAINEL_PUBLICO` | não | — | `true` libera produção sem senha |
| `PAINEL_DEV_ORIGENS` | não | — | Origens extras para o `npm run dev` (ex.: `192.168.0.10`) |
| `GITHUB_CLIENT_ID` | hospedado | — | Liga o modo hospedado. Client ID do GitHub App ([como criar](#1-crie-o-github-app)) |
| `GITHUB_CLIENT_SECRET` | hospedado | — | Client secret do GitHub App |
| `SESSAO_SEGREDO` | hospedado | — | Chave dos cookies de login (32+ caracteres) |
| `ATLASSIAN_CLIENT_ID` / `ATLASSIAN_CLIENT_SECRET` | não | — | App OAuth da Atlassian, para "Conectar Jira" |
| `PAINEL_URL` | não | origem do pedido | Endereço público usado nas URLs de retorno do OAuth |

O `.env` nunca deve ir para o git (já está no `.gitignore`).

## Como os commits viram demandas

- Commits de merge ficam de fora; os de todas as branches entram, sem repetir.
- Cada commit é agrupado pelo **primeiro chamado do Jira** citado na mensagem.
  - Com o Jira configurado, só contam as chaves que **existem** no Jira; `UTF-8` ou `SHA-256` não viram chamado.
  - Sem chamado, os commits viram uma demanda **"Sem chamado"** por repositório.
- **Tipo da issue → tipo de entrega**:

  | Jira | Painel |
  |---|---|
  | Bug, Defeito, Incidente | Correção |
  | Epic, Épico, Iniciativa | Novo sistema |
  | Story, História, Feature | Funcionalidade |
  | Improvement, Melhoria | Melhoria |
  | Spike, Débito técnico, Documentação | Estrutura |
  | Task, Sub-task e outros | regra automática pelas mensagens |

- **Prioridade → impacto**: Highest/High/Critical/Alta → alto; Medium/Média → médio; Low/Lowest/Baixa → baixo.
- O que o Jira não define é classificado pelas mensagens dos commits e aparece com o selo **"Classificação automática"**.
- Tipos, cores e frentes ficam em `lib/config.ts`.

## Atualização dos dados

A coleta roda **em segundo plano** e é **incremental**. As páginas nunca esperam o GitHub: mostram na hora o que já foi coletado.

- **Primeira carga**: lê o histórico do período (`PAINEL_DESDE`) em todos os repositórios. Pode levar alguns minutos, dependendo de quantos repositórios e commits você tem.
  - O cabeçalho mostra **"Coletando · N/M repositórios"**, e a página se atualiza sozinha.
  - O progresso é salvo a cada poucos repositórios. Se o servidor reiniciar, a coleta continua de onde parou.
- **Depois**, a cada 5 minutos (`PAINEL_INTERVALO`), o painel lista os repositórios (poucas chamadas) e **relê só os que receberam push** desde a última vez.
  - Só lê os commits a partir dali, com uma folga de 14 dias para commits enviados com atraso.
  - Branches sem commit novo são puladas. O custo depende do que mudou, não do tamanho do histórico.
- O botão **"Ao vivo · horário"** no cabeçalho força uma atualização (no máximo uma por minuto).
- A coleta fica em `data/ultima-coleta.json`. **Se o GitHub falhar**, o painel continua com esses dados e o cabeçalho troca para **"Arquivo local"**. A pasta `data/` contém dados privados e fica fora do git. Apague-a para forçar uma recoleta completa.
- Mudar `GITHUB_OWNERS`, `GITHUB_IGNORAR` ou adiantar `PAINEL_DESDE` vale na hora, sem recoletar. Recuar `PAINEL_DESDE` para mais cedo relê os repositórios para buscar o histórico mais antigo.
- Para históricos muito longos (décadas), a primeira carga é a única cara. Comece com um `PAINEL_DESDE` recente e recue aos poucos, se quiser.

## Segurança

Modo hospedado:

- Sem login do GitHub, nenhuma página nem rota `/api/coleta` abre (`proxy.ts`).
- Os cookies de sessão são criptografados e autenticados (AES-256-GCM), httpOnly, `Secure` e `SameSite=Lax`. Um cookie adulterado, vencido ou de outro nome é recusado.
- O OAuth usa `state` aleatório conferido na volta, contra CSRF no login.
- O token do GitHub App é só leitura e vence em 8 horas. O da Atlassian dura 1 hora e é renovado no caminho, dentro do mesmo cookie.
- As rotas `/api/coleta` só aceitam as consultas fixas do painel, com parâmetros validados, e o autor dos commits é sempre quem está logado.
- Nada é gravado no servidor. As respostas com dados de uma pessoa saem com `Cache-Control: no-store` e não vão para o cache compartilhado.

Modo local:

- Login HTTP Basic em todas as rotas, inclusive na ação de atualizar (`proxy.ts`). Em produção, sem senha, o painel fica bloqueado.
- Os tokens ficam só no servidor (`.env`) e nunca vão para o navegador. O token do Jira só é enviado para URL `https`.
- O painel só **lê** o GitHub e o Jira. Prefira tokens só leitura e com validade.
- Ao trocar de máquina ou se o `.env` vazar, **revogue os tokens**: no GitHub, em Developer settings → Personal access tokens; no Jira, na mesma página onde o token foi criado.
- `npm run dev` só aceita acesso de fora do localhost para origens listadas em `PAINEL_DEV_ORIGENS`.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| *Painel bloqueado: defina PAINEL_SENHA* | `npm start` sem `PAINEL_SENHA` no `.env` |
| Tela "Nenhum commit encontrado" | `GITHUB_TOKEN` vazio ou inválido. Rode `npm run testar` |
| Faltam repositórios de uma organização | Token sem `read:org`, sem autorização de SSO, ou fine-grained com outro dono |
| Commits seus não aparecem | E-mail do git não cadastrado/verificado na conta do GitHub, ou commit anterior a `PAINEL_DESDE` |
| Cabeçalho mostra "Arquivo local" | O GitHub falhou na última consulta. Veja o log do servidor (`[painel] GitHub indisponível…`) |
| Chamados sem status/título do Jira | Jira não configurado, token criado "with scopes", `JIRA_URL` sem `https`, ou você não tem acesso ao projeto |
| Siglas como `HTTP-2` viraram chamado | Configure o Jira ou defina `JIRA_PROJETOS` |
| "Aguarde N s" ao atualizar | Limite de uma atualização forçada por minuto |
  