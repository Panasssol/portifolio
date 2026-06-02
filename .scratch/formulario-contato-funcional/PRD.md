Status: ready-for-agent

# PRD — Formulário de contato funcional ("Vamos conversar?")

## Problem Statement

A seção "Vamos conversar?" (`#contato`) do portfólio exibe um formulário com nome, email e mensagem, mas ele não faz nada: o `<form>` não tem `action` nem `method`, e não há JavaScript. Um visitante que preenche e clica em "Enviar" não envia nada e não recebe nenhum retorno. Como o próprio portfólio é uma amostra do trabalho do Matheus, um formulário quebrado passa uma impressão ruim e, na prática, fecha o principal canal de contato direto do site.

## Solution

Tornar o formulário totalmente funcional. Ao enviar, o formulário faz um `POST` para uma Vercel Serverless Function (`/api/contato`) hospedada no mesmo projeto (o site já roda em `portifolio-panassol.vercel.app`, então não há CORS nem deploy separado). A função valida os dados, aplica rate limit por IP e dispara um email via Resend para `mtheuspana@gmail.com`, com `Reply-To` apontando para o email do visitante. O visitante vê feedback visual completo: estado de carregando, sucesso (com limpeza do formulário) e erro (preservando o que digitou). Spam é mitigado por três camadas: honeypot, rate limit (Upstash Redis) e validação no servidor.

## User Stories

1. Como visitante do portfólio, quero preencher nome, email e mensagem e clicar em "Enviar", para entrar em contato com o Matheus sem sair do site.
2. Como visitante, quero ver que o formulário está processando meu envio (botão "Enviando..." e desabilitado), para saber que minha ação foi registrada.
3. Como visitante, quero ver uma confirmação clara de sucesso ("Mensagem enviada! ✅") após enviar, para ter certeza de que minha mensagem chegou.
4. Como visitante, quero que o formulário seja limpo após um envio bem-sucedido, para perceber que a ação foi concluída e poder enviar outra mensagem se quiser.
5. Como visitante, quero ver uma mensagem de erro amigável caso o envio falhe, para saber que devo tentar novamente.
6. Como visitante, quero que o conteúdo digitado seja preservado quando ocorre um erro, para não precisar reescrever tudo.
7. Como visitante, quero ser avisado quando deixo um campo obrigatório vazio ou digito um email inválido, para corrigir antes de enviar.
8. Como visitante legítimo, quero conseguir corrigir e reenviar minha mensagem algumas vezes seguidas sem ser bloqueado, para não ser tratado como spammer por engano.
9. Como Matheus (dono do site), quero receber as mensagens do formulário no meu email `mtheuspana@gmail.com`, para ler e responder de onde já acompanho minha correspondência.
10. Como Matheus, quero que o `Reply-To` do email recebido seja o email do visitante, para responder direto pela minha caixa de entrada e a resposta ir para a pessoa certa.
11. Como Matheus, quero que o email recebido contenha nome, email e mensagem do visitante de forma legível, para entender o contexto do contato rapidamente.
12. Como Matheus, quero que bots que preenchem o campo honeypot escondido sejam descartados silenciosamente, para reduzir spam sem atrapalhar humanos.
13. Como Matheus, quero um limite de 5 envios por IP a cada 10 minutos, para conter rajadas de spam sem bloquear uso humano normal.
14. Como Matheus, quero que o servidor revalide todos os campos (obrigatórios, formato de email, tamanho máximo), para não depender da validação do HTML, que é trivial de burlar.
15. Como Matheus, quero que minhas chaves de API (Resend, Upstash) fiquem em variáveis de ambiente na Vercel, para não expor segredos no repositório.
16. Como Matheus, quero que o projeto continue simples, sem etapa de build desnecessária, para manter a manutenção fácil.
17. Como visitante usando leitor de tela, quero que as mensagens de status sejam anunciadas, para saber o resultado do envio sem depender só da cor.

## Implementation Decisions

**Arquitetura geral**
- O site permanece na Vercel (`portifolio-panassol.vercel.app`); a serverless function vive em `/api` no mesmo projeto. O front chama por caminho relativo (`/api/contato`), eliminando CORS e deploy separado.
- A função roda no runtime Node da Vercel e usa o `fetch` global nativo para falar com o Resend — **sem** SDK do Resend.
- O projeto passa a ter um `package.json` apenas para as dependências `@upstash/ratelimit` e `@upstash/redis`. Nenhuma etapa de build é introduzida.

**Módulo: Validação da submissão (`validateContactSubmission`)**
- Função pura, sem I/O. Recebe o corpo cru da requisição e retorna `{ valido, erros, dados }`.
- Regras: `nome`, `email` e `mensagem` obrigatórios; `email` precisa ter formato válido; limites de tamanho por campo (nome e email curtos, mensagem com teto generoso).
- Inclui a checagem de honeypot: se o campo escondido vier preenchido, a submissão é considerada inválida/descartável.
- É o módulo profundo central — concentra as regras de negócio e é testável isoladamente.

**Módulo: Rate limiter**
- Encapsula o Upstash Redis atrás de uma interface simples: `checkRateLimit(ip)` → `{ permitido }`.
- Política: sliding window de **5 requisições por 10 minutos por IP**.
- O IP é obtido do header `x-forwarded-for` (padrão na Vercel).

**Módulo: Envio de email (`sendContactEmail`)**
- Encapsula a chamada `fetch` à API do Resend (`POST https://api.resend.com/emails`) atrás de uma interface simples que recebe os dados já validados.
- Remetente: `onboarding@resend.dev` (não exige verificar domínio). Destinatário: `mtheuspana@gmail.com`. `reply_to`: email do visitante.
- Restrição conhecida: no modo sem domínio verificado, o Resend só entrega para o email dono da conta — por isso a conta Resend deve ser criada com `mtheuspana@gmail.com`.

**Módulo: Handler da API (`/api/contato`)**
- Orquestra o fluxo: parse do body → validação → rate limit → envio → resposta JSON.
- Ordem de curto-circuito: honeypot/validação primeiro (barato), depois rate limit, depois envio.
- Retorna JSON com sucesso/erro e códigos de status apropriados (ex.: 400 validação, 429 rate limit, 502 falha no provedor, 200 sucesso).

**Módulo: Controller do form (`script.js`)**
- Arquivo novo, referenciado no `index.html` (sem JS inline).
- Intercepta o submit (`preventDefault`), faz `POST` para `/api/contato` com os dados em JSON.
- Gerencia estados: carregando (botão "Enviando..." desabilitado), sucesso ("Mensagem enviada! ✅" + limpa o form) e erro ("Algo deu errado, tente novamente" + preserva o conteúdo).

**Mudanças no `index.html`**
- Adicionar um campo honeypot escondido ao `<form>`.
- Adicionar um `<div>` de status logo abaixo do botão para as mensagens de feedback.
- Incluir `<script src="script.js">`.

**Mudanças no `style.css`**
- Esconder visualmente o campo honeypot (mantendo-o acessível a bots, fora da tela para humanos).
- Estilizar as mensagens de status (sucesso/erro) em harmonia com o visual atual.

**Configuração (responsabilidade do Matheus, fora do código)**
- Criar conta no Resend usando `mtheuspana@gmail.com`; gerar API key.
- Criar conta/Redis no Upstash; obter URL e token REST.
- Cadastrar na Vercel as env vars: `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. O código lê tudo de `process.env`.

## Testing Decisions

**O que faz um bom teste:** testar comportamento externo (entradas → saídas observáveis), não detalhes de implementação. Os testes não devem depender da forma interna dos módulos, apenas do contrato.

**Prior art:** o repositório não possui testes nem test runner hoje. Introduzir um runner é parte do escopo — preferência pelo `node:test` nativo (zero dependência extra) ou Vitest. Os testes devem mockar serviços externos (Resend, Upstash) em vez de chamá-los de verdade.

**Módulos a testar:**
- **Validação da submissão** — o alvo de maior valor por ser função pura. Casos: campos faltando, email malformado, campos no limite e além do limite de tamanho, honeypot preenchido (rejeita), submissão totalmente válida (aceita e normaliza os dados).
- **Handler da API** — teste de integração do fluxo, com rate limiter e envio de email mockados. Casos: corpo inválido → 400; honeypot preenchido → descartado; limite estourado → 429; falha do provedor de email → 5xx; caminho feliz → 200 e chamada de envio com os dados corretos (incluindo `reply_to`).
- **Controller do form** — teste do comportamento de UI simulando o DOM. Casos: ao submeter mostra estado carregando; em sucesso mostra mensagem de sucesso e limpa o form; em erro mostra mensagem de erro e preserva o conteúdo digitado.

## Out of Scope

- Verificação de domínio próprio no Resend e envio a partir de um endereço com domínio custom (ex.: `contato@dominio`). Fica para depois, se desejado.
- CAPTCHA (Cloudflare Turnstile/reCAPTCHA). Honeypot + rate limit + validação são suficientes por ora; CAPTCHA pode ser adicionado se o spam persistir.
- Entrega das mensagens para qualquer outro destino além de `mtheuspana@gmail.com` (ex.: múltiplos destinatários, salvar em banco, notificação no Slack/Discord).
- Armazenamento/persistência das mensagens recebidas (apenas email, sem histórico no banco).
- Redesenho visual da seção de contato além do necessário para o honeypot e as mensagens de status.
- Internacionalização das mensagens de feedback (mantém-se em pt-BR).

## Further Notes

- O site já está em produção na Vercel (`portifolio-panassol.vercel.app`), então o deploy automático por push já cobre a publicação da função.
- Decisões tomadas durante a entrevista: backend próprio via Vercel Serverless Function (em vez de Formspree/EmailJS/mailto), Resend como provedor de envio, `fetch` direto em vez de SDK, feedback de UI completo, e a tríade honeypot + rate limit (Upstash) + validação no servidor.
- O rate limit em memória foi descartado por ser pouco confiável em ambiente serverless (cold starts e múltiplas instâncias não compartilham estado), o que motivou a escolha do Upstash Redis.
