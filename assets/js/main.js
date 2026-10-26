// Por Amor Pet Shop — scripts do site
//
// O conteúdo do time, dos projetos e da agenda vem dos arquivos em data/.
// No futuro, basta trocar as URLs abaixo pelo endereço de uma API/banco de
// dados que devolva o mesmo formato de JSON.
const DATA = {
  time: "data/time.json",
  projetos: "data/projetos.json",
  eventos: "data/eventos.json",
  adocao: "data/adocao.json",
  historia: "data/historia.json",
};

const LOAD_ERROR =
  "Não foi possível carregar o conteúdo. Se você abriu o arquivo direto do computador, rode um servidor local (veja o README).";

function loadJSON(url) {
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return res.json();
  });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Círculo com a inicial, para quem está sem foto (ou se a foto não carregar)
function initialCircle(nome) {
  const circle = el("span", "initial-circle", nome.trim().charAt(0).toUpperCase());
  circle.setAttribute("role", "img");
  circle.setAttribute("aria-label", `${nome} (sem foto)`);
  return circle;
}

// Datas dos projetos e da linha do tempo: "2026-08" (só o mês) ou "2026-08-08" (dia)
const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function formatDate(d, withYear = true) {
  if (!d) return "";
  const month = MONTH_NAMES[Number(d.slice(5, 7)) - 1];
  const year = withYear ? ` de ${d.slice(0, 4)}` : "";
  if (d.length >= 10) return `${Number(d.slice(8, 10))} de ${month}${year}`;
  return month.charAt(0).toUpperCase() + month.slice(1) + year;
}

// Mais recente primeiro; projetos sem data vão para o fim
const byNewest = (a, b) => (b.data || "").localeCompare(a.data || "");

// Capa do projeto: a primeira foto, ou a capa do primeiro vídeo
function projectCover(p) {
  const m = (p.midia || []).find((x) => x.tipo === "imagem" || x.poster);
  return m ? (m.tipo === "imagem" ? m.src : m.poster) : null;
}

// Menu do celular
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const open = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
}

// Ano atual no rodapé
document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

/* ---------------- Time ---------------- */

const teamGrid = document.querySelector("#team-grid");

if (teamGrid) {
  const filterBar = document.querySelector("#team-filters");
  const status = document.querySelector("#team-status");

  loadJSON(DATA.time)
    .then((members) => {
      status.remove();

      // Gestores (gestao: true) aparecem no filtro "Gestão" e também no time da área deles.
      // Quem auxilia outros times (apoio: ["T.I"]) aparece nesses filtros sem mudar o cargo.
      const helps = (m, area) => (m.apoio || []).includes(area);
      const inArea = (m, area) =>
        area === "Todos" || m.area === area || helps(m, area) || (area === "Gestão" && m.gestao);
      // Dentro de um time: gestor do time, depois quem auxilia, depois os integrantes
      const rank = (m, area) => (m.gestao && m.area === area ? 0 : helps(m, area) ? 1 : 2);
      const filterBy = (area) => {
        const list = members.filter((m) => inArea(m, area));
        if (area === "Todos" || area === "Gestão") return list;
        return list.sort((a, b) => rank(a, area) - rank(b, area));
      };

      const areas = ["Todos"];
      const addArea = (a) => a && !areas.includes(a) && areas.push(a);
      members.forEach((m) => addArea(m.gestao ? "Gestão" : m.area));
      members.forEach((m) => [m.area, ...(m.apoio || [])].forEach(addArea));

      areas.forEach((area) => {
        const btn = el("button", null, area);
        btn.type = "button";
        btn.setAttribute("aria-pressed", String(area === "Todos"));
        btn.addEventListener("click", () => {
          filterBar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
          btn.setAttribute("aria-pressed", "true");
          renderTeam(filterBy(area));
        });
        filterBar.appendChild(btn);
      });

      renderTeam(members);
    })
    .catch(() => {
      status.textContent = LOAD_ERROR;
    });

  function renderTeam(list) {
    teamGrid.innerHTML = "";
    list.forEach((m) => {
      const card = el("article", "member");
      const fallback = () => {
        const box = el("div", "member-fallback");
        box.appendChild(initialCircle(m.nome));
        return box;
      };

      let pic;
      if (m.foto) {
        pic = el("img");
        pic.src = m.foto;
        pic.alt = `Foto de ${m.nome}`;
        pic.loading = "lazy";
        pic.width = 480;
        pic.height = 480;
        // Se a foto não carregar, mostra a inicial no lugar do ícone quebrado
        pic.addEventListener("error", () => pic.replaceWith(fallback()));
      } else {
        pic = fallback();
      }

      const info = el("div", "member-info");
      info.append(el("div", "member-name", m.nome), el("div", "member-role", m.cargo));
      card.append(pic, info);
      teamGrid.appendChild(card);
    });
  }
}

/* ---------------- Projetos ---------------- */

const projectGrid = document.querySelector("#project-grid");

if (projectGrid) {
  const filterBar = document.querySelector("#project-filters");
  const dialog = document.querySelector("#project-dialog");
  let projects = [];
  let visible = [];
  let currentId = null;
  let lastFocus = null;

  loadJSON(DATA.projetos)
    .then((list) => {
      projects = list.filter((p) => p.id && p.titulo).sort(byNewest);
      visible = projects;
      buildFilters();
      renderGrid();
      openFromHash();
    })
    .catch(() => {
      projectGrid.innerHTML = "";
      projectGrid.appendChild(el("p", "team-status", LOAD_ERROR));
    });

  // O link projetos.html#id-do-projeto abre o projeto direto
  window.addEventListener("hashchange", openFromHash);

  function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (projects.some((p) => p.id === id)) openProject(id);
  }

  function buildFilters() {
    const tipos = ["Todos", ...new Set(projects.map((p) => p.tipo).filter(Boolean))];
    tipos.forEach((tipo) => {
      const btn = el("button", null, tipo);
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(tipo === "Todos"));
      btn.addEventListener("click", () => {
        filterBar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        visible = tipo === "Todos" ? projects : projects.filter((p) => p.tipo === tipo);
        renderGrid();
      });
      filterBar.appendChild(btn);
    });
  }

  function renderGrid() {
    projectGrid.innerHTML = "";
    visible.forEach((p) => {
      const card = el("a", "card project-card");
      card.href = `#${p.id}`;

      const cover = el("div", "project-cover");
      const src = projectCover(p);
      if (src) {
        const img = el("img");
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        cover.appendChild(img);
      } else {
        cover.appendChild(el("span", "project-emoji", p.emoji || "🐾"));
      }
      const media = p.midia || [];
      const videos = media.filter((m) => m.tipo === "video").length;
      const photos = media.length - videos;
      const badge = [videos && `▶ ${videos} vídeo${videos > 1 ? "s" : ""}`, photos && `📷 ${photos}`].filter(Boolean).join("  ");
      if (badge) cover.appendChild(el("span", "project-badge", badge));

      const body = el("div", "project-card-body");
      const meta = el("div", "tl-meta");
      if (p.data) meta.appendChild(el("span", "tl-date", formatDate(p.data)));
      if (p.tipo) meta.appendChild(el("span", "org-tag", p.tipo));
      body.append(meta, el("h3", null, p.titulo));
      if (p.resumo) body.appendChild(el("p", null, p.resumo));
      body.appendChild(el("span", "project-more", "Ver projeto →"));

      card.append(cover, body);
      projectGrid.appendChild(card);
    });
  }

  function renderMedia(m) {
    if (m.tipo === "video") {
      const video = el("video", "project-video");
      video.src = m.src;
      if (m.poster) video.poster = m.poster;
      video.controls = true;
      video.preload = "none";
      video.playsInline = true;
      if (m.alt) video.setAttribute("aria-label", m.alt);
      return video;
    }
    const img = el("img", m.inteira ? "media-contain" : null);
    img.src = m.src;
    img.alt = m.alt || "";
    img.loading = "lazy";
    return img;
  }

  // Números de destaque do projeto, ex.: { "valor": "4,7", "sufixo": "/5", "rotulo": "média de satisfação" }
  function renderHighlights(list) {
    const box = el("div", "highlights");
    list.forEach((h) => {
      const item = el("div", "highlight");
      const value = el("strong", null, h.valor);
      if (h.sufixo) value.appendChild(el("span", null, h.sufixo));
      item.append(value, el("p", null, h.rotulo));
      box.appendChild(item);
    });
    return box;
  }

  // Resultado de pesquisa: uma barra por resposta, todas na mesma escala (o total de entrevistados)
  function renderSurvey(s) {
    const box = el("section", "survey");
    box.appendChild(el("h3", null, s.titulo || "Resultado da pesquisa"));
    const grid = el("div", "survey-grid");
    s.perguntas.forEach((q) => {
      const fig = el("figure", "survey-q");
      fig.appendChild(el("figcaption", null, q.pergunta));
      const max = Math.max(...q.respostas.map((r) => r.n));
      q.respostas.forEach((r) => {
        const pct = Math.round((r.n / s.total) * 100);
        const row = el("div", "survey-row");
        row.title = `${r.texto}: ${r.n} de ${s.total} (${pct}%)`;
        const bar = el("span", r.n === max ? "survey-bar is-top" : "survey-bar");
        bar.style.width = `${(r.n / s.total) * 100}%`;
        const track = el("span", "survey-track");
        track.appendChild(bar);
        row.append(el("span", "survey-label", r.texto), track, el("span", "survey-value", `${r.n} de ${s.total}`));
        fig.appendChild(row);
      });
      grid.appendChild(fig);
    });
    box.appendChild(grid);
    if (s.nota) box.appendChild(el("p", "survey-note", s.nota));
    return box;
  }

  function openProject(id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    if (!dialog.open) lastFocus = document.activeElement;
    currentId = id;
    if (location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);

    dialog.innerHTML = "";
    const inner = el("div", "pd-inner");

    const header = el("header", "pd-header");
    const meta = el("div", "tl-meta");
    if (p.data) meta.appendChild(el("span", "tl-date", formatDate(p.data)));
    if (p.tipo) meta.appendChild(el("span", "org-tag", p.tipo));
    if (p.setor) meta.appendChild(el("span", "tl-setor", p.setor));
    const title = el("h2", null, `${p.emoji ? p.emoji + " " : ""}${p.titulo}`);
    title.id = "project-dialog-title";
    const close = el("button", "pd-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Fechar");
    close.addEventListener("click", () => dialog.close());
    header.append(meta, title, close);

    const body = el("div", "pd-body");
    const media = p.midia || [];
    if (media.length) body.appendChild(el("div", "pd-media")).appendChild(renderMedia(media[0]));
    (p.paragrafos || []).forEach((t) => body.appendChild(el("p", null, t)));
    if (p.destaques && p.destaques.length) body.appendChild(renderHighlights(p.destaques));
    if (p.pesquisa) body.appendChild(renderSurvey(p.pesquisa));
    if (p.atividades && p.atividades.length) {
      const list = el("ul", "tl-sub");
      p.atividades.forEach((a) => {
        const li = el("li");
        li.appendChild(el("strong", null, (a.data ? formatDate(a.data, false) + " · " : "") + a.titulo));
        if (a.texto) li.appendChild(el("p", null, a.texto));
        list.appendChild(li);
      });
      body.appendChild(list);
    }
    // Fotos e vídeos extras viram uma galeria; foto abre em tamanho real
    if (media.length > 1) {
      const gallery = el("div", "gallery");
      media.slice(1).forEach((m) => {
        if (m.tipo === "video") return gallery.appendChild(renderMedia(m));
        const a = el("a");
        a.href = m.src;
        a.target = "_blank";
        a.rel = "noopener";
        a.appendChild(renderMedia(m));
        gallery.appendChild(a);
      });
      body.appendChild(gallery);
    }
    if (p.link) {
      const a = el("a", "btn btn-small btn-outline", p.link.texto);
      a.href = p.link.url;
      if (/^https?:/.test(p.link.url)) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      body.appendChild(a);
    }

    // Anterior / próximo dentro da lista que está filtrada
    const nav = el("footer", "pd-nav");
    const list = visible.some((x) => x.id === id) ? visible : projects;
    const i = list.findIndex((x) => x.id === id);
    [
      [list[i - 1], "← Mais recente", "pd-prev"],
      [list[i + 1], "Mais antigo →", "pd-next"],
    ].forEach(([target, label, cls]) => {
      if (!target) return nav.appendChild(el("span"));
      const btn = el("button", cls);
      btn.type = "button";
      btn.append(el("small", null, label), el("span", null, target.titulo));
      btn.addEventListener("click", () => openProject(target.id));
      nav.appendChild(btn);
    });

    inner.append(header, body, nav);
    dialog.appendChild(inner);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    inner.scrollTop = 0;
    close.focus();
  }

  dialog.addEventListener("close", () => {
    dialog.querySelectorAll("video").forEach((v) => v.pause());
    if (location.hash === `#${currentId}`) history.replaceState(null, "", location.pathname + location.search);
    currentId = null;
    if (lastFocus) lastFocus.focus();
  });
  // Clicar fora da janela fecha
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
}

/* ---------------- Agenda ---------------- */

const calendar = document.querySelector("#calendar");

if (calendar) {
  const monthLabel = calendar.querySelector("[data-month-label]");
  const grid = calendar.querySelector("[data-grid]");
  const listTitle = document.querySelector("#event-list-title");
  const list = document.querySelector("#event-list");

  const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
  const dayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const today = new Date();
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let entries = [];
  let selectedDay = null;

  const parseDate = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d || 1);
  };
  const keyOf = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const isDay = (e) => e.data.length >= 10;

  calendar.querySelector("[data-prev]").addEventListener("click", () => changeMonth(-1));
  calendar.querySelector("[data-next]").addEventListener("click", () => changeMonth(1));

  // O calendário junta: eventos (data/eventos.json), projetos e suas atividades
  // (data/projetos.json) e marcos (data/historia.json). Projetos com data só do
  // mês aparecem como "durante o mês".
  Promise.all([
    loadJSON(DATA.eventos),
    loadJSON(DATA.projetos).catch(() => []),
    loadJSON(DATA.historia).catch(() => []),
  ])
    .then(([events, projects, history]) => {
      events.forEach((e) => {
        const holiday = e.tipo === "feriado";
        entries.push({ ...e, tipo: holiday ? "feriado" : "evento", emoji: e.emoji || (holiday ? "🏖️" : "📅") });
      });
      projects.forEach((p) => {
        if (p.data) entries.push({ data: p.data, titulo: p.titulo, emoji: p.emoji, descricao: p.resumo, tipo: "atividade", projeto: p.id });
        (p.atividades || []).forEach((a) => {
          if (a.data) entries.push({ data: a.data, titulo: a.titulo, emoji: p.emoji, descricao: p.titulo, tipo: "atividade", projeto: p.id });
        });
      });
      history.forEach((h) => {
        if (h.data) entries.push({ data: h.data, titulo: h.titulo, emoji: h.emoji, descricao: h.resumo, tipo: "marco" });
      });
      entries = entries
        .filter((e) => e.data && e.titulo)
        .sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
      render();
    })
    .catch(() => {
      list.innerHTML = "";
      list.appendChild(el("p", "team-status", LOAD_ERROR));
    });

  function changeMonth(delta) {
    view = new Date(view.getFullYear(), view.getMonth() + delta, 1);
    selectedDay = null;
    render();
  }

  function render() {
    monthLabel.textContent = capitalize(monthFmt.format(view));
    renderGrid();
    renderList();
  }

  function renderGrid() {
    grid.innerHTML = "";
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstWeekday; i++) grid.appendChild(el("span", "cal-day is-empty"));

    for (let d = 1; d <= daysInMonth; d++) {
      const key = keyOf(new Date(year, month, d));
      const dayEntries = entries.filter((e) => e.data === key);
      const btn = el("button", "cal-day", String(d));
      btn.type = "button";
      if (key === keyOf(today)) btn.classList.add("is-today");
      if (dayEntries.length) {
        const onlyHoliday = dayEntries.every((e) => e.tipo === "feriado");
        btn.classList.add(onlyHoliday ? "is-holiday" : "has-event");
        btn.setAttribute("aria-label", `${d}: ${dayEntries.map((e) => e.titulo).join(", ")}`);
        btn.title = dayEntries.map((e) => e.titulo).join("\n");
      }
      if (key === selectedDay) btn.setAttribute("aria-pressed", "true");
      btn.addEventListener("click", () => {
        selectedDay = selectedDay === key ? null : key;
        renderGrid();
        renderList();
      });
      grid.appendChild(btn);
    }
  }

  function renderList() {
    let shown;
    if (selectedDay) {
      shown = entries.filter((e) => e.data === selectedDay);
      listTitle.textContent = capitalize(dayFmt.format(parseDate(selectedDay)));
    } else {
      const prefix = keyOf(view).slice(0, 7);
      // Primeiro o que vale para o mês todo, depois dia a dia
      shown = [
        ...entries.filter((e) => !isDay(e) && e.data === prefix),
        ...entries.filter((e) => isDay(e) && e.data.startsWith(prefix)),
      ];
      listTitle.textContent = capitalize(monthFmt.format(view));
    }

    list.innerHTML = "";
    if (!shown.length) {
      list.appendChild(el("p", "event-empty", selectedDay ? "Nada marcado neste dia." : "Nada marcado neste mês."));
      return;
    }

    shown.forEach((e) => {
      const item = el("article", `event is-${e.tipo}`);
      const badge = el("div", "event-date");
      if (isDay(e)) {
        const date = parseDate(e.data);
        badge.append(
          el("strong", null, String(date.getDate())),
          el("span", null, date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""))
        );
      } else {
        badge.classList.add("is-month");
        badge.append(el("strong", null, e.emoji || "🗓️"), el("span", null, "o mês"));
      }

      const body = el("div", "event-body");
      const showEmoji = isDay(e) && e.tipo !== "evento" && e.tipo !== "feriado" && e.emoji;
      body.appendChild(el("h3", null, (showEmoji ? e.emoji + " " : "") + e.titulo));
      const meta = [
        !isDay(e) ? "Durante o mês" : null,
        e.tipo === "feriado" ? "Feriado" : null,
        e.hora,
        e.local,
      ].filter(Boolean).join(" · ");
      if (meta) body.appendChild(el("p", "event-meta", meta));
      if (e.descricao) body.appendChild(el("p", null, e.descricao));
      if (e.projeto) {
        const a = el("a", "event-link", "Ver projeto →");
        a.href = `projetos.html#${e.projeto}`;
        body.appendChild(a);
      }
      item.append(badge, body);
      list.appendChild(item);
    });
  }
}

/* ---------------- Adoção ---------------- */

const adoptionList = document.querySelector("#adoption-list");

if (adoptionList) {
  const digits = (s) => (s || "").replace(/\D/g, "");
  // Números brasileiros sem código do país ganham o 55 na frente
  const withCountry = (n) => (n.length <= 11 ? "55" + n : n);

  function link(className, href, text) {
    const a = el("a", className, text);
    a.href = href;
    if (/^https?:/.test(href)) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    return a;
  }

  loadJSON(DATA.adocao)
    .then((orgs) => {
      adoptionList.innerHTML = "";
      orgs.forEach((o) => {
        const card = el("article", "card org");
        const body = el("div", "org-body");
        if (o.tipo) body.appendChild(el("span", "org-tag", o.tipo));
        body.appendChild(el("h3", null, o.nome));
        if (o.descricao) body.appendChild(el("p", null, o.descricao));

        const info = el("ul", "org-info");
        if (o.endereco) {
          const li = el("li");
          li.append("📍 ");
          li.appendChild(
            link(null, "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(o.endereco), o.endereco)
          );
          info.appendChild(li);
        }
        if (o.horario) info.appendChild(el("li", null, "🕘 " + o.horario));
        if (o.telefone) info.appendChild(el("li", null, "📞 " + o.telefone));
        if (info.children.length) body.appendChild(info);

        const actions = el("div", "org-actions");
        if (o.site) actions.appendChild(link("btn btn-small", o.site, "Ver animais"));
        if (o.whatsapp) {
          actions.appendChild(link("btn btn-small btn-whatsapp", "https://wa.me/" + withCountry(digits(o.whatsapp)), "WhatsApp"));
        }
        if (o.instagram) {
          const user = o.instagram.replace(/^@/, "");
          actions.appendChild(link("btn btn-small btn-outline", "https://www.instagram.com/" + user + "/", "Instagram"));
        }
        if (o.telefone) {
          actions.appendChild(link("btn btn-small btn-outline", "tel:+" + withCountry(digits(o.telefone)), "Ligar"));
        }

        card.append(body, actions);
        adoptionList.appendChild(card);
      });
    })
    .catch(() => {
      adoptionList.innerHTML = "";
      adoptionList.appendChild(el("p", "team-status", LOAD_ERROR));
    });
}

// Botão "Compartilhar no WhatsApp": manda o link desta página
const shareWhatsApp = document.querySelector("#share-whatsapp");
if (shareWhatsApp) {
  const text = `Conheça lugares de confiança para adotar um cão ou gato 🐾 ${location.href.split("#")[0]}`;
  shareWhatsApp.href = "https://wa.me/?text=" + encodeURIComponent(text);
}

/* ---------------- Página inicial ---------------- */

const homeStats = document.querySelector("#home-stats");

if (homeStats) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Mostra o número certo e, quando o bloco aparece na tela, anima de 0 até ele
  function animateCount(node, target) {
    node.textContent = target;
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / 1200, 1);
        node.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      // Garantia: se a animação for pausada (aba em segundo plano), fica o número final
      setTimeout(() => (node.textContent = target), 1400);
    });
    observer.observe(node);
  }

  const setStat = (name, value) => {
    const node = homeStats.querySelector(`[data-stat="${name}"]`);
    if (node) animateCount(node, value);
  };

  loadJSON(DATA.time)
    .then((members) => {
      const team = members.filter((m) => m.area !== "Instrutora");
      setStat("integrantes", team.length);
      setStat("areas", new Set(team.map((m) => m.area).filter((a) => a !== "Gestão")).size);
      renderAvatars(members);
    })
    .catch(() => {});
  loadJSON(DATA.projetos).then((p) => {
    setStat("projetos", p.length);
    renderFeaturedProject(p);
  }).catch(() => {});
  loadJSON(DATA.adocao).then((a) => setStat("adocao", a.length)).catch(() => {});
  loadJSON(DATA.eventos).then(renderNextEvent).catch(() => renderNextEvent([]));

  function renderAvatars(members) {
    const wall = document.querySelector("#home-team");
    if (!wall) return;
    members.forEach((m) => {
      const a = el("a", "avatar");
      a.href = "time.html";
      a.title = `${m.nome} · ${m.cargo}`;
      if (!m.foto) {
        a.appendChild(initialCircle(m.nome));
        wall.appendChild(a);
        return;
      }
      const img = el("img");
      img.src = m.foto;
      img.alt = m.nome;
      img.loading = "lazy";
      img.width = 72;
      img.height = 72;
      img.addEventListener("error", () => img.replaceWith(initialCircle(m.nome)));
      a.appendChild(img);
      wall.appendChild(a);
    });
  }

  function renderNextEvent(events) {
    const box = document.querySelector("#home-event .feature-content");
    if (!box) return;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const next = events
      .filter((e) => e.data && e.titulo && e.tipo !== "feriado" && e.data >= today)
      .sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")))[0];

    box.innerHTML = "";
    if (!next) {
      box.appendChild(el("p", "feature-empty", "Nenhum evento marcado por enquanto. Fique de olho no nosso calendário!"));
      return;
    }
    const [y, m, d] = next.data.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const row = el("div", "event");
    const badge = el("div", "event-date");
    badge.append(
      el("strong", null, String(d)),
      el("span", null, date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""))
    );
    const body = el("div", "event-body");
    body.appendChild(el("h3", null, next.titulo));
    const meta = [date.toLocaleDateString("pt-BR", { weekday: "long" }), next.hora, next.local].filter(Boolean).join(" · ");
    body.appendChild(el("p", "event-meta", meta));
    if (next.descricao) body.appendChild(el("p", null, next.descricao));
    row.append(badge, body);
    box.appendChild(row);
  }

  // O projeto em destaque é o mais recente (pela data) de data/projetos.json
  function renderFeaturedProject(projects) {
    const card = document.querySelector("#home-project");
    const box = card && card.querySelector(".feature-content");
    if (!box || !projects.length) return;
    const p = [...projects].sort(byNewest)[0];
    const cover = projectCover(p);

    box.innerHTML = "";
    if (cover) {
      const img = el("img", "feature-thumb");
      img.src = cover;
      img.alt = "";
      img.loading = "lazy";
      box.appendChild(img);
    } else {
      box.appendChild(el("span", "feature-thumb feature-emoji", p.emoji || "🐾"));
    }
    const text = el("div");
    if (p.data) text.appendChild(el("span", "tl-date", formatDate(p.data)));
    text.appendChild(el("h3", null, p.titulo));
    const first = p.resumo || (p.paragrafos || [])[0] || "";
    const excerpt = first.length > 170 ? first.slice(0, first.lastIndexOf(" ", 170)) + "…" : first;
    text.appendChild(el("p", null, excerpt));
    box.appendChild(text);

    const link = card.querySelector("a.btn");
    link.href = `projetos.html#${p.id}`;
    link.textContent = "Ver projeto";
  }
}

/* ---------------- Linha do tempo (Quem Somos) ---------------- */

const timeline = document.querySelector("#timeline");

if (timeline) {
  const monthsNav = document.querySelector("#timeline-months");
  const filterBar = document.querySelector("#timeline-filters");
  const summary = document.querySelector("#timeline-summary");
  const progress = timeline.querySelector(".timeline-progress");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const UPCOMING = "Em breve";

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const monthName = (d) => MONTH_NAMES[Number(d.slice(5, 7)) - 1];
  const dateLabel = (d) => formatDate(d, false);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // A linha do tempo junta os marcos (data/historia.json) com todos os projetos (data/projetos.json)
  Promise.all([
    loadJSON(DATA.historia).catch(() => []),
    loadJSON(DATA.projetos).catch(() => []),
    loadJSON(DATA.eventos).catch(() => []),
  ])
    .then(([history, projects, events]) => {
      const fromProjects = projects.map((p) => ({ ...p, projeto: p.id }));
      // Ordem cronológica; o que vale para o mês todo ("2026-08") vem antes dos dias do mês
      const items = [...history, ...fromProjects]
        .filter((h) => h.data && h.titulo)
        .sort((a, b) => a.data.localeCompare(b.data));
      // Próximos eventos do calendário entram no fim como "Em breve"
      const upcoming = events
        .filter((e) => e.data && e.titulo && e.tipo !== "feriado" && e.data >= today)
        .sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")))
        .slice(0, 3)
        .map((e) => ({
          data: e.data,
          titulo: e.titulo,
          emoji: "📅",
          tipo: UPCOMING,
          resumo: [e.hora, e.local].filter(Boolean).join(" · "),
          texto: e.descricao ? [e.descricao] : [],
          futuro: true,
        }));
      render(items, upcoming);
    })
    .catch(() => {
      timeline.querySelector(".team-status").textContent = LOAD_ERROR;
    });

  function renderItem(h, index) {
    const item = el("article", h.futuro ? "tl-item is-future" : "tl-item");
    item.dataset.tipo = h.tipo || "";
    const dot = el("div", "tl-dot", h.emoji || "🐾");
    dot.setAttribute("aria-hidden", "true");

    const card = el("div", "tl-card");
    const cover = projectCover(h);
    if (cover) {
      const thumb = el("img", "tl-thumb");
      thumb.src = cover;
      thumb.alt = "";
      thumb.loading = "lazy";
      card.appendChild(thumb);
    }
    const meta = el("div", "tl-meta");
    meta.appendChild(el("span", "tl-date", dateLabel(h.data)));
    if (h.tipo) meta.appendChild(el("span", "org-tag", h.tipo));
    if (h.setor) meta.appendChild(el("span", "tl-setor", h.setor));
    card.append(meta, el("h4", null, h.titulo));
    if (h.resumo) card.appendChild(el("p", "tl-summary", h.resumo));

    const subs = h.atividades || [];
    const paragraphs = h.paragrafos || h.texto || [];
    const hasDetails = paragraphs.length || subs.length || h.link || h.projeto;
    if (hasDetails) {
      const details = el("div", "tl-details");
      details.id = `tl-detalhes-${index}`;
      details.hidden = true;
      paragraphs.forEach((t) => details.appendChild(el("p", null, t)));
      if (subs.length) {
        const list = el("ul", "tl-sub");
        subs.forEach((a) => {
          const li = el("li");
          li.appendChild(el("strong", null, (a.data ? dateLabel(a.data) + " · " : "") + a.titulo));
          if (a.texto) li.appendChild(el("p", null, a.texto));
          list.appendChild(li);
        });
        details.appendChild(list);
      }
      const links = el("div", "tl-links");
      if (h.projeto) {
        const media = (h.midia || []).length;
        const a = el("a", "tl-link", media ? "Ver projeto com fotos e vídeos →" : "Ver projeto completo →");
        a.href = `projetos.html#${h.projeto}`;
        links.appendChild(a);
      }
      if (h.link) {
        const a = el("a", "tl-link", h.link.texto + " →");
        a.href = h.link.url;
        if (/^https?:/.test(h.link.url)) {
          a.target = "_blank";
          a.rel = "noopener";
        }
        links.appendChild(a);
      }
      if (links.children.length) details.appendChild(links);

      const extra = subs.length ? ` (${subs.length} atividades)` : "";
      const toggle = el("button", "tl-toggle", "Ver detalhes" + extra);
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", details.id);
      toggle.addEventListener("click", () => {
        const open = details.hidden;
        details.hidden = !open;
        item.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.textContent = open ? "Ver menos" : "Ver detalhes" + extra;
        updateProgress();
      });
      card.append(details, toggle);
    }

    item.append(dot, card);
    return item;
  }

  function render(items, upcoming) {
    timeline.querySelector(".team-status").remove();
    if (!items.length && !upcoming.length) {
      timeline.appendChild(el("p", "team-status", "Ainda não há atividades registradas."));
      return;
    }

    // Resumo: "9 atividades registradas, de abril a setembro de 2026."
    if (items.length) {
      const first = items[0].data;
      const last = items[items.length - 1].data;
      const span =
        first.slice(0, 4) === last.slice(0, 4)
          ? `de ${monthName(first)} a ${monthName(last)} de ${last.slice(0, 4)}`
          : `de ${monthName(first)} de ${first.slice(0, 4)} a ${monthName(last)} de ${last.slice(0, 4)}`;
      summary.textContent = `${items.length} momentos registrados, ${span}. Clique em "Ver detalhes" para saber mais.`;
    }

    // Agrupa por mês
    const groups = new Map();
    items.forEach((h) => {
      const key = h.data.slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(h);
    });
    if (upcoming.length) groups.set("em-breve", upcoming);
    const multiYear = new Set(items.map((h) => h.data.slice(0, 4))).size > 1;

    let index = 0;
    const chips = [];
    groups.forEach((list, key) => {
      const group = el("div", "tl-month");
      group.id = key === "em-breve" ? "em-breve" : `mes-${key}`;
      const label = key === "em-breve" ? "Em breve 🔜" : `${cap(monthName(key))} de ${key.slice(0, 4)}`;
      group.appendChild(el("h3", "tl-month-label", label));
      list.forEach((h) => group.appendChild(renderItem(h, index++)));
      timeline.appendChild(group);

      const short =
        key === "em-breve" ? "Em breve" : cap(monthName(key).slice(0, 3)) + (multiYear ? "/" + key.slice(2, 4) : "");
      const chip = el("button", null, short);
      chip.type = "button";
      chip.addEventListener("click", () =>
        group.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" })
      );
      monthsNav.appendChild(chip);
      chips.push({ chip, group });
    });

    // Filtros por tipo de atividade
    const tipos = ["Todos", ...new Set(items.map((h) => h.tipo).filter(Boolean))];
    tipos.forEach((tipo) => {
      const btn = el("button", null, tipo);
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(tipo === "Todos"));
      btn.addEventListener("click", () => {
        filterBar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        timeline.querySelectorAll(".tl-item").forEach((it) => {
          it.hidden = !(tipo === "Todos" || it.dataset.tipo === tipo);
        });
        chips.forEach(({ chip, group }) => {
          const empty = !group.querySelector(".tl-item:not([hidden])");
          group.hidden = empty;
          chip.hidden = empty;
        });
        updateProgress();
      });
      filterBar.appendChild(btn);
    });

    if ("IntersectionObserver" in window) {
      // Destaca na barra o mês que está na tela
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            chips.forEach(({ chip, group }) => {
              const active = group === entry.target;
              chip.setAttribute("aria-current", String(active));
              if (active) monthsNav.scrollTo({ left: chip.offsetLeft - monthsNav.clientWidth / 2 + chip.clientWidth / 2 });
            });
          });
        },
        { rootMargin: "-45% 0px -50% 0px" }
      );
      chips.forEach(({ group }) => spy.observe(group));

      // Cards aparecem com animação ao rolar
      if (!reduceMotion) {
        timeline.classList.add("tl-animate");
        const reveal = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-visible");
              reveal.unobserve(entry.target);
            });
          },
          { threshold: 0.15 }
        );
        timeline.querySelectorAll(".tl-item").forEach((it) => reveal.observe(it));
      }
    }

    // Linha que vai "enchendo" conforme a rolagem
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          updateProgress();
          ticking = false;
        });
      },
      { passive: true }
    );
    window.addEventListener("resize", updateProgress);
    updateProgress();

    if (location.hash && timeline.querySelector(location.hash)) {
      timeline.querySelector(location.hash).scrollIntoView();
    }
  }

  function updateProgress() {
    const r = timeline.getBoundingClientRect();
    const p = r.height ? (window.innerHeight * 0.6 - r.top) / r.height : 0;
    progress.style.height = `${Math.min(Math.max(p, 0), 1) * 100}%`;
  }
}
