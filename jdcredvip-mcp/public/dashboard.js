const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

const state = {
  volumeChart: null,
  commissionChart: null
};

const select = (selector) => document.querySelector(selector);

const updateSummary = (dados) => {
  const { meta, products } = dados;
  const metrics = meta.metrics;

  select("#meta-title").textContent = meta.titulo;
  select("#meta-reference").textContent = new Date(meta.dataReferencia).toLocaleDateString("pt-BR");
  select("#meta-author").textContent = `Publicado por ${meta.publicadoPor}`;

  select("#metric-contracts").textContent = numberFormatter.format(metrics.totalContratos);
  select("#metric-volume-bruto").textContent = currencyFormatter.format(metrics.volumeBruto);
  select("#metric-volume-liquido").textContent = currencyFormatter.format(metrics.volumeLiquido);
  select("#metric-comissao").textContent = currencyFormatter.format(metrics.comissaoTotal);

  renderTable(products);
  renderCharts(products);
};

const renderTable = (products) => {
  const tbody = select("#products-table tbody");
  tbody.innerHTML = "";

  if (!products.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "Nenhum produto informado para esta meta.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${product.produto}</td>
      <td>${numberFormatter.format(product.quantidade)}</td>
      <td>${currencyFormatter.format(product.volumeLiquido)}</td>
      <td>${currencyFormatter.format(product.volumeBruto)}</td>
      <td>${currencyFormatter.format(product.comissao)}</td>
    `;

    tbody.appendChild(row);
  });
};

const renderCharts = (products) => {
  const labels = products.map((item) => item.produto);
  const backgroundColors = ["#38bdf8", "#34d399", "#fbbf24", "#f87171", "#c084fc", "#60a5fa", "#f472b6"];

  const buildDataset = (label, data, colorIndexOffset = 0) => ({
    label,
    data,
    backgroundColor: labels.map((_, index) => backgroundColors[(index + colorIndexOffset) % backgroundColors.length]),
    borderWidth: 1
  });

  const volumeCtx = document.getElementById("volumeChart");
  const commissionCtx = document.getElementById("commissionChart");

  state.volumeChart?.destroy();
  state.commissionChart?.destroy();

  state.volumeChart = new Chart(volumeCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        buildDataset("Volume Líquido (R$)", products.map((item) => item.volumeLiquido)),
        buildDataset("Volume Bruto (R$)", products.map((item) => item.volumeBruto), 2)
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          ticks: {
            callback: (value) => currencyFormatter.format(value)
          }
        }
      },
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });

  state.commissionChart = new Chart(commissionCtx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          label: "Comissão (R$)",
          data: products.map((item) => item.comissao),
          backgroundColor: labels.map((_, index) => backgroundColors[(index + 1) % backgroundColors.length]),
          borderWidth: 0
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
};

const carregarDashboard = async () => {
  const response = await fetch("/api/dashboard");

  if (!response.ok) {
    throw new Error("Não foi possível carregar o dashboard.");
  }

  const payload = await response.json();

  if (payload.status !== "ok") {
    throw new Error(payload.mensagem || "Não foi possível carregar o dashboard.");
  }

  updateSummary(payload.dados);
};

const carregarHistorico = async () => {
  const response = await fetch("/api/metas?limit=6");
  if (!response.ok) throw new Error("Não foi possível carregar o histórico.");

  const payload = await response.json();
  if (payload.status !== "ok") throw new Error(payload.mensagem || "Falha ao carregar o histórico.");

  const list = select("#history-list");
  list.innerHTML = "";

  payload.dados.forEach((meta) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <div>
        <strong>${meta.titulo}</strong>
        <p>${new Date(meta.dataReferencia).toLocaleDateString("pt-BR")} · Publicado por ${meta.publicadoPor}</p>
      </div>
      <span>${currencyFormatter.format(meta.metrics.volumeLiquido)}</span>
    `;
    list.appendChild(item);
  });

  select("#history-count").textContent = `${payload.dados.length} registros`;
};

const mostrarErro = (mensagem) => {
  select("#meta-title").textContent = mensagem;
  select("#meta-reference").textContent = "-";
  select("#meta-author").textContent = "-";
  select("#metric-contracts").textContent = "-";
  select("#metric-volume-bruto").textContent = "-";
  select("#metric-volume-liquido").textContent = "-";
  select("#metric-comissao").textContent = "-";

  renderTable([]);
  state.volumeChart?.destroy();
  state.commissionChart?.destroy();
};

const inicializar = async () => {
  select("#current-year").textContent = new Date().getFullYear();

  try {
    await Promise.all([carregarDashboard(), carregarHistorico()]);
  } catch (error) {
    console.error(error);
    mostrarErro(error.message);
  }
};

select("#reload-button").addEventListener("click", inicializar);

document.addEventListener("DOMContentLoaded", inicializar);
