# Configurar o login com Google (obrigatório, só você pode fazer)

O app precisa de um "Client ID" do Google para poder pedir permissão de acesso
à sua conta (Google Sheets + Google Drive). Isso exige criar um projeto
gratuito no Google Cloud Console com a sua própria conta Google — é um passo
que eu (Claude) não posso fazer por você, porque exige login na sua conta.

Leva uns 5-10 minutos. Depois disso você não precisa mexer nisso de novo.

## 1. Criar um projeto no Google Cloud

1. Acesse https://console.cloud.google.com/projectcreate
2. Dê um nome (ex: "GestBar") e clique em **Criar**.
3. Espere a notificação de "projeto criado" e selecione esse projeto no topo da página.

## 2. Ativar as APIs necessárias

1. Acesse https://console.cloud.google.com/apis/library/sheets.googleapis.com e clique em **Ativar**.
2. Acesse https://console.cloud.google.com/apis/library/drive.googleapis.com e clique em **Ativar**.

## 3. Configurar a "tela de consentimento OAuth"

1. Acesse https://console.cloud.google.com/apis/credentials/consent
2. Escolha **Externo** (External) e clique em **Criar**.
3. Preencha nome do app, e-mail de suporte e e-mail de contato do desenvolvedor (pode usar o seu e-mail para tudo).
4. Nas telas seguintes, pode ir clicando em **Salvar e continuar** sem adicionar escopos manualmente.
5. Na tela de **Usuários de teste** (Test users), clique em **Add users** e adicione o seu próprio e-mail do Google (o que você vai usar no app). Isso é obrigatório enquanto o app estiver em modo "Testing" — sem isso o login falha com erro de acesso negado.

## 4. Criar o Client ID (credencial OAuth)

1. Acesse https://console.cloud.google.com/apis/credentials
2. Clique em **+ Criar credenciais** → **ID do cliente OAuth**.
3. Tipo do aplicativo: **Aplicativo da Web**.
4. Em **Origens JavaScript autorizadas**, adicione:
   - `http://localhost:5500`
5. Clique em **Criar**. Vai aparecer um **Client ID** parecido com
   `123456789-abcdefg.apps.googleusercontent.com` — copie ele.

## 5. Colar o Client ID no app

Abra o arquivo [`config.js`](config.js) desta pasta e troque:

```js
CLIENT_ID: "SUBSTITUA_PELO_SEU_CLIENT_ID.apps.googleusercontent.com",
```

pelo Client ID que você copiou. Salve o arquivo.

## 6. Rodar o app

No PowerShell, dentro desta pasta:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Depois abra `http://localhost:5500` no navegador. Clique em **Entrar com
Google**, aceite a tela de permissão (vai avisar que o app não é verificado —
normal para uso pessoal em modo teste, clique em "Avançado" → "Acessar
[nome do app] (não seguro)") e comece a usar.

Na primeira vez, o app cria automaticamente uma planilha chamada
**OrganizadorTrabalho-DB** no seu Google Drive com as abas "Tarefas" e
"Notas". Você pode abrir essa planilha a qualquer momento para conferir ou
editar os dados manualmente.

> Se quiser usar em outra porta, rode `serve.ps1 -Port 8080` e adicione
> `http://localhost:8080` nas origens autorizadas do passo 4.
