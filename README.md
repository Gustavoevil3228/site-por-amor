# Por Amor Pet Shop 🐾

Site do **Por Amor Pet Shop**, migrado do Google Sites para HTML, CSS e JavaScript puros, pronto para ser hospedado de graça no **GitHub Pages**.

## Estrutura

```
index.html                  Página inicial (números, próximo evento e projeto em destaque são automáticos)
quem-somos.html             Quem Somos + linha do tempo (marcos + todos os projetos)
missao-visao-valores.html   Missão, Visão e Valores (+ mapa)
projetos.html               Projetos em cards (clique abre o projeto completo) + Calendário
time.html                   Time do Por Amor (gerado a partir de data/time.json)
adote.html                  Onde adotar, antes de adotar e como ajudar (gerado a partir de data/adocao.json)
diversao.html               Quiz "Qual pet combina com você?" + calculadora de idade do pet
redes-sociais.html          Instagram, LinkedIn e e-mail

data/time.json              Time (gerado a partir de fotos-time/, não editar à mão)
data/projetos.json          Projetos e atividades: aparecem em Projetos E na linha do tempo
data/eventos.json           Eventos do calendário
data/adocao.json            Lugares para adotar (ONGs, centros de adoção)
data/quiz.json              Perguntas e resultados do quiz
data/historia.json          Marcos que não são projetos (ex.: a criação do Por Amor)

assets/css/style.css        Todo o visual do site (cores no topo do arquivo, em :root)
assets/js/main.js           Menu do celular + montagem do time, projetos, calendário, adoção e página inicial
assets/js/diversao.js       Quiz e calculadora de idade
assets/img/                 Imagens otimizadas (fotos do time em assets/img/time/)
assets/video/               Vídeos dos projetos (.mp4)

fotos-time/                 Fotos do time ("Nome - Cargo.jpg"), viram a página do time
scripts/atualizar_time.py   Gera o time a partir de fotos-time/
.github/workflows/site.yml  Publica o site no GitHub Pages a cada alteração
```

## Como ver o site no computador

O time, os projetos e o calendário são carregados dos arquivos em `data/`, e o navegador bloqueia isso quando o arquivo é aberto com dois cliques. Por isso, rode um servidor local na pasta do site:

```bash
python -m http.server 8080
```

Depois é só abrir http://localhost:8080 no navegador.

## Como editar

Os arquivos `.json` podem ser editados direto no site do GitHub: abra o arquivo, clique no lápis ✏️, edite e clique em **Commit changes**. O site atualiza sozinho em 1 ou 2 minutos (às vezes leva até 10 por causa do cache do navegador).

> Atenção às vírgulas no JSON: cada item `{ ... }` é separado por vírgula, mas o **último** não leva vírgula. Se o calendário ou os projetos sumirem depois de uma edição, quase sempre é isso.

### Calendário (`data/eventos.json`)

O calendário (na página Projetos) junta três coisas sozinho:

- **Projetos e atividades** de `data/projetos.json`: aparecem no dia da `data` deles (as `atividades` com data também ganham o seu dia). Projeto com data só do mês (`"2026-07"`) aparece na lista do mês como "durante o mês". **Não precisa cadastrar de novo aqui.**
- **Marcos** de `data/historia.json`.
- **Eventos** deste arquivo: o que ainda vai acontecer e os feriados.

```json
[
  { "data": "2026-10-12", "tipo": "feriado", "titulo": "Feriado: Nossa Senhora Aparecida", "descricao": "Sem curso." },
  { "data": "2026-10-19", "hora": "09:00", "titulo": "Saída técnica: Parque do Carmo", "local": "Parque do Carmo" }
]
```

Só `data` (sempre `ANO-MÊS-DIA`) e `titulo` são obrigatórios. Com `"tipo": "feriado"` o dia fica com outra cor e não entra como "Próximo evento". O próximo evento aparece na página inicial e no fim da linha do tempo ("Em breve").

Quando um evento acontecer, ele pode virar um projeto em `data/projetos.json` (com fotos, texto etc.) e sair daqui, para não aparecer duas vezes.

### Projetos e atividades (`data/projetos.json`)

**Cada projeto ou atividade é cadastrado uma vez só** e aparece em dois lugares: na página **Projetos** (card + janela com tudo) e na **linha do tempo** do Quem Somos. Para adicionar, copie um item, troque os campos e coloque no **fim** do arquivo:

```json
{
  "id": "feira-de-adocao",
  "titulo": "Feira de adoção",
  "data": "2026-10",
  "emoji": "🐶",
  "tipo": "Na prática",
  "setor": "Marketing",
  "resumo": "Uma frase curta que aparece no card e na linha do tempo.",
  "paragrafos": ["Primeiro parágrafo.", "Segundo parágrafo."],
  "atividades": [
    { "data": "2026-10-05", "titulo": "Primeiro dia", "texto": "O que aconteceu nesse dia." }
  ],
  "destaques": [{ "valor": "4,7", "sufixo": "/5", "rotulo": "média de satisfação" }],
  "midia": [
    { "tipo": "imagem", "src": "assets/img/projetos/feira-de-adocao-1.jpg", "alt": "Descrição da foto" },
    { "tipo": "video", "src": "assets/video/feira-de-adocao.mp4", "poster": "assets/img/projetos/feira-de-adocao-1.jpg" }
  ],
  "link": { "texto": "Ver no Instagram", "url": "https://www.instagram.com/por.amor_petshop" }
}
```

- Obrigatórios: `id` (sem acentos nem espaços; vira o link direto `projetos.html#feira-de-adocao`), `titulo` e `data`.
- `data`: só o mês (`"2026-10"`) ou o dia (`"2026-10-05"`). A ordem é automática: Projetos mostra do mais recente ao mais antigo, e a linha do tempo, do mais antigo ao mais recente.
- `tipo` vira filtro nas duas páginas. Use sempre os mesmos nomes: Integração, Conscientização, Palestra, Na prática, Redes sociais, Apresentação, Carreira.
- `midia`: a primeira foto (ou a capa do primeiro vídeo) vira a capa do card; as outras viram uma galeria dentro do projeto. Sem mídia, o card usa o `emoji`. Use `"inteira": true` em imagens que não podem ser cortadas (gráficos, cartazes).
- O projeto **mais recente** aparece como "Projeto em destaque" na página inicial.

**Fotos e vídeos:** coloque as fotos em `assets/img/projetos/` (JPG com até ~1600 px de largura) e os vídeos em `assets/video/`. O GitHub não aceita arquivos acima de 100 MB, e vídeo direto do celular costuma ter centenas de MB: converta para `.mp4` em 720p antes (o vídeo do "Espro que eu vejo" caiu de 717 MB para 25 MB assim).

### Linha do tempo (`data/historia.json`)

A linha do tempo do Quem Somos junta **todos os projetos** com os **marcos** deste arquivo, ou seja, momentos que não são projetos (como a criação do Por Amor). O formato é o mesmo dos projetos, sem `id`. Os **próximos eventos** de `data/eventos.json` aparecem sozinhos no fim, como "Em breve".

### Lugares para adotar (`data/adocao.json`)

Cada lugar vira um card na página **Adote**. Só `nome` é obrigatório; os campos vazios (`""`) simplesmente não aparecem:

```json
{
  "nome": "Nome da ONG",
  "tipo": "ONG",
  "descricao": "Uma ou duas frases sobre o lugar.",
  "endereco": "Rua Tal, 123 – Bairro, São Paulo",
  "horario": "Sábados das 10h às 16h",
  "telefone": "(11) 1234-5678",
  "whatsapp": "(11) 91234-5678",
  "instagram": "nomedaong",
  "site": "https://site-da-ong.org.br/adocao"
}
```

O endereço vira link para o Google Maps, o telefone vira botão "Ligar" e o WhatsApp vira botão que abre a conversa. **Só coloque contatos conferidos no site ou no Instagram oficial da organização.**

### Quiz (`data/quiz.json`)

Cada resposta dá pontos para um ou mais resultados (`"pontos": { "independente": 2, "brincalhao": 1 }`); ganha o resultado com mais pontos. Dá para mudar os textos, trocar perguntas ou criar resultados novos (adicione em `"resultados"` e use o mesmo nome nos pontos).

### Página inicial

Nada nela precisa ser editado à mão: os números (integrantes, áreas, projetos, lugares de adoção), o **próximo evento** (o mais próximo de `data/eventos.json`), o **projeto em destaque** e as fotos do time se atualizam sozinhos a partir dos arquivos em `data/`.

### Time (`fotos-time/`)

O nome do arquivo de cada foto vira o nome e o cargo da pessoa no site: `Nome - Cargo.jpg` (ex.: `Gustavo - Gestor Geral.jpg`). Para escolher a ordem, use um número na frente: `01 - Gustavo - Gestor Geral.jpg`.

**Pelo GitHub (sem instalar nada):** abra a pasta `fotos-time` no GitHub → **Add file → Upload files** → arraste as fotos → **Commit changes**. O workflow de publicação recorta e reduz as fotos, monta a página do time e publica o site sozinho. Para tirar alguém, apague a foto; para trocar nome ou cargo, renomeie a foto (aperte `.` na página do repositório para abrir o editor web, que permite renomear arquivos).

**No computador (para ver antes de publicar):**

```bash
python scripts/atualizar_time.py
```

A área usada nos filtros (RH, Marketing, T.I, Planejamento…) é descoberta pelo cargo. Quem tem "Gestor" ou "Gestora" no cargo aparece no filtro **Gestão** e também no time da área (ex.: `Raquel Pedrosa - Gestora de Recursos Humanos` aparece em Gestão e em RH); Gestor(a) Geral fica só em Gestão.

Quem **auxilia** outro time sem mudar o cargo leva o time entre colchetes no fim do nome do arquivo. O que está entre colchetes não aparece no site, só coloca a pessoa naquele filtro: `Vitor - Gestor Geral [T.I].jpg`, `Luiza - Gestora Geral [Planejamento].jpg` (para mais de um time, separe por vírgula: `[RH, Planejamento]`). No filtro de um time, a ordem é: gestor do time, quem auxilia e depois os integrantes.

> Como o time é gerado a partir de `fotos-time/`, **não edite `data/time.json` à mão**: a próxima publicação sobrescreve o arquivo. Para mudar nome ou cargo, renomeie a foto.

### Outros

- **Mudar textos fixos:** edite direto o `.html` da página.
- **Mudar cores ou fontes:** altere as variáveis no começo de `assets/css/style.css`.
- **Adicionar uma página nova:** copie uma página existente, troque o conteúdo de `<main>` e adicione o link no menu (`<nav>`) de **todas** as páginas.

## Publicar no GitHub Pages

1. Crie um repositório **público** no GitHub (por exemplo, `por-amor-pet-shop`). O GitHub Pages é grátis para repositórios públicos.
2. Envie os arquivos desta pasta:
   ```bash
   git init
   git add .
   git commit -m "Site do Por Amor Pet Shop"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/por-amor-pet-shop.git
   git push -u origin main
   ```
3. No GitHub, vá em **Settings → Pages** e, em *Source*, escolha **GitHub Actions**.
4. Vá na aba **Actions**, abra o workflow **Publicar site** e clique em **Run workflow** (só na primeira vez; depois ele roda sozinho a cada alteração).
5. Em 1 ou 2 minutos o site estará em `https://SEU-USUARIO.github.io/por-amor-pet-shop/`.

Daí em diante, qualquer alteração enviada para a branch `main` (por `git push` ou editando pelo site do GitHub) publica o site de novo automaticamente. Se algo der errado, a aba **Actions** mostra o erro.

## E a API e o banco de dados?

O GitHub Pages só hospeda arquivos estáticos (HTML, CSS, JS, imagens). Ele **não roda servidor, API nem banco de dados**. Mesmo assim, dá para ter dados dinâmicos usando um serviço externo gratuito, chamado direto pelo JavaScript do site:

| Opção | Para quê | Plano grátis |
|---|---|---|
| [Supabase](https://supabase.com) | Banco de dados Postgres + API pronta + login | Sim |
| [Firebase](https://firebase.google.com) | Banco em tempo real + login + armazenamento de fotos | Sim |
| [Formspree](https://formspree.io) | Formulário de contato que envia e-mail | Sim |

O time, os projetos e o calendário já foram feitos pensando nisso: hoje eles leem os arquivos em `data/`, e no futuro basta trocar os endereços no objeto `DATA`, no topo de `assets/js/main.js`, por uma API que devolva o mesmo formato. Com o Supabase, por exemplo, daria para ter uma página de administração com login para cadastrar eventos e projetos pelo próprio site.

Se um dia precisarem de um back-end próprio (por exemplo, Node.js ou Python), dá para mantê-lo em outro serviço (Render, Railway, Vercel) e continuar com o site no GitHub Pages.
