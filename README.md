# Organizador de Trabalho

PWA (site instalável) para organizar tarefas e notas de trabalho, sincronizado
com uma planilha do Google Sheets no seu próprio Google Drive. Sem backend
próprio — só arquivos estáticos + APIs do Google direto do navegador.

## Como rodar

Veja o [`SETUP.md`](SETUP.md) primeiro (precisa gerar um Client ID do Google,
passo único). Depois:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Abra `http://localhost:5500`.

## Estrutura

- `index.html`, `styles.css` — interface (abas Tarefas / Notas / Pedidos / Histórico de Pedidos / Produtos)
- `app.js` — estado da tela, formulários, listas
- `google-sync.js` — login Google + leitura/escrita na planilha (Sheets API + Drive API)
- `config.js` — Client ID do Google (gerado por você, veja SETUP.md)
- `manifest.json`, `service-worker.js`, `icons/` — deixam o site instalável como app (PWA)
- `serve.ps1` — servidor estático local, sem dependências (usa `HttpListener` do .NET)

## Colar dados direto no formulário

Ao abrir "+ Nova tarefa" ou "+ Nova nota", tem uma caixa de "colar" no topo do
formulário. Cole um texto neste formato e clique em "Preencher":

Tarefa:
```
Título: Pagar conta Copasa
Descrição: Fatura de água - R$ 46,55
Prioridade: Alta
Prazo: 04/08/2026
```

Nota:
```
Título: Ideias para o cardápio
Conteúdo: Adicionar opção vegana
Tags: cardapio, ideias
```

O reconhecimento de campo por campo não é sensível a acento/maiúsculas, e
linhas sem "Campo:" na frente são tratadas como continuação do campo anterior
(útil para descrições com várias linhas). Depois de clicar em "Preencher", os
campos aparecem prontos — só conferir e clicar em Salvar.

## Aba Pedidos (pedidos de bebidas por local)

Pensada pra colar direto o pedido copiado do WhatsApp, no formato:

```
Pedido elis:

Chopp
Brahma 5
Stella 1

Cerveja
Stella gold 3

Bar ideal

Chopp
Brahma 5
```

Regras do texto:
- Uma linha que termina em número é sempre "Produto Quantidade" (ex: `Brahma 5`).
- Uma linha sem número é um cabeçalho: vira **Categoria** dentro do local atual,
  a não ser que venha depois de uma linha em branco dupla (ou comece com
  "Pedido") — nesse caso vira um novo **Local**.
- Não precisa de uma lista fixa de categorias — qualquer nome funciona,
  novas categorias são reconhecidas automaticamente.

Esse jeito (colar texto) fica escondido atrás de "Colar texto do WhatsApp
(opcional)" dentro do formulário — é um atalho secundário. O jeito principal
é o catálogo por local, explicado abaixo.

### Modo principal: tabelas por local (sempre disponíveis)

Em "+ Novo pedido", abaixo de "locais cadastrados", você cadastra os locais
uma vez (ex: "Elis Bar", "Bar Ideal") com **+ Adicionar local**. Cada local
cadastrado ganha sua própria tabela, sempre visível dali pra frente, com
**todos os produtos da aba Produtos** agrupados por categoria e um campo de
quantidade em branco do lado de cada um — igual uma planilha de pedido.

Pra fazer um pedido: escolha a **Data** (vem preenchida com o dia de hoje),
preenche a quantidade dos produtos que quer em cada tabela de local (deixa
em branco os que não quer pedir) e clica em **Salvar pedido**. Só vira linha
no histórico o que tiver quantidade preenchida — as tabelas continuam lá,
zeradas, prontas pro próximo pedido. Um local que não for mais usado pode ser
removido com **Remover local** (não apaga pedidos já salvos).

Todo pedido salvo fica registrado com a data — para consultar depois, veja a
aba **Histórico de Pedidos**.

## Aba Histórico de Pedidos

Lista todos os pedidos já salvos, agrupados por local + data (mais recente
primeiro), com filtro por local no topo ("Todos os locais" ou um específico)
para facilitar comparar consumo entre bares ao longo do tempo. Tem
**Excluir pedido** em cada card, caso precise remover um registro.

## Aba Produtos (catálogo de produtos)

Cadastro simples de Nome + Categoria, usado para alimentar o modo "montar
pelo catálogo" da aba Pedidos.

- **+ Novo produto**: cadastra um produto por vez (com a mesma caixa de
  "colar" das outras abas — `Nome:` / `Categoria:`).
- **Importar vários**: cola uma lista inteira de uma vez, no formato:

```
Chopp

Brahma Claro
Brahma Escuro
Patagônia

Refrigerantes

Pepsi
Guaraná Antártica
```

Uma linha sozinha (seguida de linha em branco) vira a **Categoria**; as
linhas seguintes até a próxima linha em branco são os produtos dessa
categoria. Se todos os produtos de um bloco começarem com a mesma primeira
palavra (ex: `Chopp Brahma Claro`, `Chopp Stella`), essa palavra vira a
categoria automaticamente e é removida do nome. Produtos com nome+categoria
já cadastrados são ignorados (não duplica). Novos produtos podem ser
adicionados a qualquer momento, tanto um de cada vez quanto em lote.

## Instalar como app

Com o servidor rodando e a página aberta no Chrome/Edge, clique no ícone de
"Instalar" na barra de endereço (ou menu → "Instalar app"). Isso cria um
atalho que abre em janela própria, sem barra do navegador.

## Uso pelo celular

Hoje o app roda em `localhost`, que só existe no seu PC — o celular não
alcança. Para instalar no celular também, é preciso publicar os arquivos em
algum lugar com HTTPS público (ex: GitHub Pages, gratuito). Isso é um passo
futuro opcional, que exige você ter (ou criar) uma conta no serviço escolhido
— posso ajudar a preparar os arquivos para o deploy quando você quiser seguir
por esse caminho.

## Próximos passos possíveis

- **Contatos**: adicionar uma terceira aba "Contatos" na planilha e uma nova
  seção no app, seguindo o mesmo padrão de Tarefas/Notas.
- **Deploy público** (GitHub Pages ou similar) para acesso via celular.
- Busca/filtro por texto, ordenação, notificações de prazo.
