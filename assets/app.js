/* ============================================================
   UM GOLO · UM KM — lógica do painel
   - lê data/data.json (gerado pelo GitHub Action)
   - anima os contadores e barras de progresso
   - atualiza sozinho de X em X minutos
   ============================================================ */

const REFRESH_MS = 5 * 60 * 1000; // 5 min
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const nf = new Intl.NumberFormat("pt-PT");
const nf1 = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 });

const $ = (sel, root = document) => root.querySelector(sel);

/* ---------- utilidades ---------- */

function formatDate(iso, withTime = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const opts = withTime
    ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" };
  return d.toLocaleString("pt-PT", opts);
}

function relativeTime(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return formatDate(iso);
}

// Anima um número de `from` até `to`. `decimals` controla as casas.
function animateNumber(el, to, { decimals = 0, duration = 1200 } = {}) {
  const from = parseFloat(el.dataset.count || "0") || 0;
  el.dataset.count = String(to);
  const fmt = decimals ? nf1 : nf;
  if (REDUCED || from === to) {
    el.textContent = fmt.format(to);
    return;
  }
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    const val = from + (to - from) * eased;
    el.textContent = fmt.format(decimals ? val : Math.round(val));
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = fmt.format(to);
  };
  requestAnimationFrame(tick);
}

/* ---------- render ---------- */

function renderRunners(data) {
  const wrap = $("#runners");
  const tpl = $("#runnerTpl");
  const goals = data.goals?.total ?? 0;

  // quem corre mais conta como líder (entre os que têm dados)
  const withKm = data.runners.filter((r) => typeof r.km === "number");
  const leaderId =
    withKm.length > 1
      ? withKm.reduce((a, b) => (b.km > a.km ? b : a)).id
      : null;

  // reusa cartões já existentes para animar em vez de recriar
  const existing = new Map(
    [...wrap.children].map((el) => [el.dataset.id, el])
  );

  data.runners.forEach((r) => {
    let card = existing.get(r.id);
    if (!card) {
      card = tpl.content.firstElementChild.cloneNode(true);
      card.dataset.id = r.id;
      wrap.appendChild(card);
    }
    existing.delete(r.id);

    const required = r.required ?? goals;
    const pending = typeof r.km !== "number";
    const remaining = pending ? null : Math.max(0, required - r.km);
    const done = !pending && remaining === 0 && required > 0;

    card.classList.toggle("is-pending", pending);
    card.classList.toggle("is-done", done);
    card.classList.toggle("is-leader", r.id === leaderId && !pending);

    $(".runner-name", card).textContent = r.name;

    const state = $(".runner-state", card);
    state.classList.remove("ok", "debt");
    if (pending) {
      state.textContent = "EM BREVE";
    } else if (done) {
      state.textContent = "EM DIA";
      state.classList.add("ok");
    } else {
      state.textContent = "EM DÍVIDA";
      state.classList.add("debt");
    }

    const kmNum = $(".km-num", card);
    if (pending) {
      kmNum.textContent = "—";
      kmNum.dataset.count = "0";
    } else {
      animateNumber(kmNum, r.km, { decimals: 1 });
    }

    const pct = required > 0 && !pending ? Math.min(1, r.km / required) : 0;
    const fill = $(".progress-fill", card);
    requestAnimationFrame(() => {
      fill.style.width = (pct * 100).toFixed(1) + "%";
    });
    fill.classList.toggle("over", !pending && r.km >= required && required > 0);
    $(".progress", card).setAttribute(
      "aria-valuenow",
      Math.round(pct * 100)
    );

    $(".meta-required", card).textContent = required
      ? `${nf.format(required)} km`
      : "—";
    const remEl = $(".meta-remaining", card);
    const remLabel = $(".meta-remaining-wrap", card).lastChild; // nó de texto
    if (pending) {
      remEl.textContent = "—";
      remLabel.textContent = " em falta";
    } else if (done) {
      remEl.textContent = "0 km";
      remLabel.textContent = " — completo ✓";
    } else {
      remEl.textContent = `${nf1.format(remaining)} km`;
      remLabel.textContent = " em falta";
    }
  });

  // remove cartões que já não existam na config
  existing.forEach((el) => el.remove());
}

function render(data) {
  animateNumber($("#goals"), data.goals?.total ?? 0, { decimals: 0 });
  $("#firstGoal").textContent = data.goals?.firstGoalDate
    ? formatDate(data.goals.firstGoalDate, true)
    : "—";
  $("#updated").textContent = relativeTime(data.generatedAt);
  $("#updated").title = formatDate(data.generatedAt, true);
  $("#matches").textContent = nf.format(data.goals?.matchesPlayed ?? 0);

  const sample = $("#sampleTag");
  sample.hidden = !data.isSample;

  const live = $("#liveTag");
  const fresh =
    data.generatedAt &&
    Date.now() - new Date(data.generatedAt).getTime() < 90 * 60 * 1000;
  live.classList.toggle("is-off", !fresh && !data.isSample);
  live.querySelector("[data-live-label]").textContent =
    data.isSample ? "EXEMPLO" : fresh ? "AO VIVO" : "EM PAUSA";

  renderRunners(data);
  document.title = `${data.goals?.total ?? 0} golos · Um Golo · Um Km`;
}

/* ---------- carregamento ---------- */

async function load() {
  try {
    const res = await fetch("data/data.json?t=" + Date.now(), {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    render(await res.json());
  } catch (e) {
    console.error("Falha ao carregar os dados:", e);
    const live = $("#liveTag");
    live.classList.add("is-off");
    live.querySelector("[data-live-label]").textContent = "SEM DADOS";
  }
}

load();
setInterval(load, REFRESH_MS);
// recarrega quando a aba volta a ficar visível
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") load();
});
