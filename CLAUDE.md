# GestBar — instruções para o Claude

Este arquivo é lido automaticamente por qualquer sessão do Claude Code aberta
dentro desta pasta (em qualquer computador). Ele existe pra você não precisar
reexplicar o projeto do zero toda vez.

## O que é o GestBar

PWA (site instalável) do Ozz para organizar tarefas, notas e pedidos de bar.
Roda em `https://ozzjunio.github.io/organizador-trabalho/` (produção) ou
localmente via `serve.ps1` (veja [README.md](README.md)). Os dados ficam numa
planilha do Google Sheets ("OrganizadorTrabalho-DB") no Drive do usuário —
não há backend próprio.

Estrutura completa e formatos de colar: ver [README.md](README.md). Passo a
passo de configuração do Google Cloud: ver [SETUP.md](SETUP.md).

## Rotina: ler e-mail e sugerir itens pro GestBar

Quando o Ozz pedir pra ler o e-mail dele e trazer informações para o app, a
rotina combinada é:

1. Buscar e-mails não lidos (ou o que ele especificar) usando a ferramenta de
   Gmail conectada.
2. Filtrar só itens realmente acionáveis (contas a pagar, tarefas de
   contabilidade, prazos) — ignorar notas fiscais informativas, promoções,
   avisos automáticos sem ação necessária.
3. Apresentar cada item **já formatado no padrão de colar do app**, pra ele
   copiar daqui e colar direto no formulário certo. Não inventar prioridade
   ou prazo — usar o que está no e-mail (data de vencimento vira `Prazo`,
   valor vira parte da `Descrição`).

Formato de colar — **Tarefa** (usar pra contas a pagar, pendências):
```
Título: <resumo curto e acionável>
Descrição: <detalhes, valor, referência>
Prioridade: Alta | Média | Baixa
Prazo: DD/MM/AAAA
```

Formato de colar — **Nota** (informação sem ação/prazo):
```
Título: <título>
Conteúdo: <texto>
Tags: tag1, tag2
```

Formato de colar — **Produto** (cadastro no catálogo, aba Produtos):
```
Nome: <nome do produto>
Categoria: <categoria>
```
Pra importar vários de uma vez (aba Produtos → Importar vários): uma linha
sozinha vira Categoria, as linhas seguintes até a próxima linha em branco são
os produtos dela. Se todas as linhas de um bloco começarem com a mesma
palavra (ex: "Chopp Brahma Claro"), essa palavra vira a categoria e é
removida do nome.

Formato de colar — **Pedido** (aba Pedidos, texto de WhatsApp com vários
locais): ver seção "Aba Pedidos" do [README.md](README.md) — regra
resumida: linha terminando em número = Produto + Quantidade; linha sem
número = Categoria (ou Local novo, se vier depois de linha em branco dupla
ou começar com "Pedido").

## Catálogo e locais já cadastrados no app

- **Locais fixos**: Elis Bar, Bar Ideal (tabelas sempre visíveis na aba
  Pedidos — não peça pra "escolher" um local, os dois já aparecem prontos
  pra preencher quantidade).
- **Categorias de produto em uso**: Chopp, Cervejas, Refrigerantes (mas
  novas categorias são aceitas automaticamente, não é uma lista travada).
- A lista completa de produtos padrão está em `DEFAULT_PRODUTOS` dentro de
  [app.js](app.js) — é criada sozinha no primeiro login (ou quando falta
  algum item), sem precisar de ação manual.

## Como inserir dados de fato no app

Por padrão, o Ozz prefere **copiar e colar ele mesmo** — então normalmente
sua resposta deve ser o texto pronto no formato acima, sem tentar
automatizar a inserção. Só tente preencher o formulário direto por
automação de navegador se ele pedir explicitamente e a ferramenta de
automação de browser estiver disponível e conectada à sessão logada dele.

## Preferências do Ozz (como trabalhar com ele)

- Gosta de respostas diretas e curtas, sem enrolação.
- Prefere que mudanças no app sejam testadas (localmente e, quando fizer
  sentido, no layout mobile) antes de avisar que terminou.
- Depois de qualquer mudança em `index.html`, `app.js`, `styles.css` ou
  `google-sync.js`, é preciso subir a versão do `CACHE_NAME` em
  [service-worker.js](service-worker.js), senão o navegador (principalmente
  no celular) continua servindo a versão antiga em cache.
- Deploy é via GitHub Pages: depois de editar, `git add`, `git commit`,
  `git push origin main` — o site atualiza sozinho em 1-2 minutos.
