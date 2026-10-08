// Por Amor Pet Shop — página Diversão (quiz e calculadora de idade)
// Usa loadJSON() e el() de main.js, que é carregado antes deste arquivo.

/* ---------------- Quiz: qual pet combina com você? ---------------- */

const quizBox = document.querySelector("#quiz-box");

if (quizBox) {
  loadJSON("data/quiz.json")
    .then((quiz) => startQuiz(quiz))
    .catch(() => {
      quizBox.innerHTML = "";
      quizBox.appendChild(el("p", "team-status", LOAD_ERROR));
    });

  function startQuiz(quiz) {
    const total = quiz.perguntas.length;
    let current = 0;
    let answers = [];

    showQuestion();

    function showQuestion() {
      const q = quiz.perguntas[current];
      quizBox.innerHTML = "";

      const progress = el("div", "quiz-progress");
      progress.appendChild(el("span", null, `Pergunta ${current + 1} de ${total}`));
      const bar = el("div", "quiz-bar");
      const fill = el("div", "quiz-bar-fill");
      fill.style.width = `${(current / total) * 100}%`;
      bar.appendChild(fill);
      progress.appendChild(bar);

      const title = el("h3", "quiz-question", q.pergunta);
      title.tabIndex = -1;

      const options = el("div", "quiz-options");
      q.respostas.forEach((r, i) => {
        const btn = el("button", "quiz-option", r.texto);
        btn.type = "button";
        btn.addEventListener("click", () => {
          answers[current] = i;
          current++;
          if (current < total) showQuestion();
          else showResult();
        });
        options.appendChild(btn);
      });

      quizBox.append(progress, title, options);

      if (current > 0) {
        const back = el("button", "quiz-back", "← Voltar");
        back.type = "button";
        back.addEventListener("click", () => {
          current--;
          showQuestion();
        });
        quizBox.appendChild(back);
      }
      if (current > 0) title.focus();
    }

    function showResult() {
      // Soma os pontos de cada resposta; empate fica com o primeiro resultado da lista
      const score = {};
      Object.keys(quiz.resultados).forEach((k) => (score[k] = 0));
      answers.forEach((a, i) => {
        const pts = quiz.perguntas[i].respostas[a].pontos || {};
        Object.entries(pts).forEach(([k, v]) => (score[k] = (score[k] || 0) + v));
      });
      const winner = Object.keys(score).reduce((best, k) => (score[k] > score[best] ? k : best));
      const r = quiz.resultados[winner];

      quizBox.innerHTML = "";
      const result = el("div", "quiz-result");
      result.appendChild(el("div", "quiz-result-emoji", r.emoji));
      result.appendChild(el("p", "quiz-result-label", "O pet que combina com você é…"));
      const title = el("h3", null, r.titulo);
      title.tabIndex = -1;
      result.appendChild(title);
      result.appendChild(el("p", null, r.texto));
      if (r.dica) result.appendChild(el("p", "quiz-tip", "💡 " + r.dica));

      const actions = el("div", "btn-row");
      const go = el("a", "btn", r.botao || "Quero adotar");
      go.href = r.link || "adote.html";
      const share = el("a", "btn btn-whatsapp", "Compartilhar resultado");
      const page = location.href.split("#")[0] + "#quiz";
      share.href =
        "https://wa.me/?text=" +
        encodeURIComponent(`Fiz o quiz do Por Amor e o pet que combina comigo é: ${r.titulo} ${r.emoji} Faça também: ${page}`);
      share.target = "_blank";
      share.rel = "noopener";
      const again = el("button", "btn btn-outline", "Refazer quiz");
      again.type = "button";
      again.addEventListener("click", () => {
        current = 0;
        answers = [];
        showQuestion();
        quizBox.querySelector(".quiz-question").focus();
      });
      actions.append(go, share, again);
      result.appendChild(actions);

      quizBox.appendChild(result);
      title.focus();
    }
  }
}

/* ---------------- Calculadora: idade do pet em anos humanos ---------------- */

const ageForm = document.querySelector("#age-form");

if (ageForm) {
  const result = document.querySelector("#age-result");
  const porteGroup = document.querySelector("#porte-group");

  // Estimativa comum em tabelas veterinárias: 1º ano = 15 anos humanos, 2º ano = +9,
  // depois +4 por ano para gatos e cães pequenos, +5 para médios e +6 para grandes.
  const PER_YEAR = { gato: 4, pequeno: 4, medio: 5, grande: 6 };

  function humanAge(years, perYear) {
    if (years <= 1) return 15 * years;
    if (years <= 2) return 15 + 9 * (years - 1);
    return 24 + perYear * (years - 2);
  }

  function stage(age) {
    if (age < 15) return ["Filhote", "Fase de descobertas: muita brincadeira, vacinas em dia e paciência para ensinar."];
    if (age < 25) return ["Jovem", "Cheio de energia! Ótima fase para brincadeiras e para aprender coisas novas."];
    if (age < 56) return ["Adulto", "Fase tranquila: mantenha as consultas anuais no veterinário."];
    return ["Idoso", "Merece carinho extra e consultas mais frequentes no veterinário. 💜"];
  }

  function update() {
    const data = new FormData(ageForm);
    const especie = data.get("especie");
    porteGroup.hidden = especie !== "cao";

    const anos = Math.min(Math.max(parseInt(data.get("anos"), 10) || 0, 0), 30);
    const meses = Math.min(Math.max(parseInt(data.get("meses"), 10) || 0, 0), 11);
    const years = anos + meses / 12;

    result.innerHTML = "";
    if (years <= 0) {
      result.appendChild(el("p", "age-hint", "Informe a idade do seu pet para ver o resultado."));
      return;
    }

    const perYear = especie === "gato" ? PER_YEAR.gato : PER_YEAR[data.get("porte")];
    const age = Math.round(humanAge(years, perYear));
    const [label, tip] = stage(age);
    const nome = especie === "gato" ? "Seu gato" : "Seu cão";

    const big = el("p", "age-big");
    big.append(`${nome} teria cerca de `);
    big.appendChild(el("strong", null, `${age} anos`));
    big.append(" se fosse gente!");
    const tag = el("span", "org-tag", label);
    result.append(tag, big, el("p", null, tip));
  }

  ageForm.addEventListener("input", update);
  ageForm.addEventListener("change", update);
  ageForm.addEventListener("submit", (e) => e.preventDefault());
  update();
}
