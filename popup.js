chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
  if (!currentTab) return;

  chrome.runtime.sendMessage({ action: "getStreams", tabId: currentTab.id }, (response) => {
    const contentDiv = document.getElementById("content");
    const countBadge = document.getElementById("video-count");

    const streams = response && response.streams ? response.streams : [];
    countBadge.innerText = `${streams.length} detectado(s)`;

    if (streams.length === 0) return;

    // Constrói a lista de vídeos encontrados
    const listContainer = document.createElement("div");
    listContainer.className = "stream-list";

    streams.forEach((item, index) => {
      const url = item.url;
      const isMaster = url.includes("master.m3u8") || !url.includes("playlist-");
      
      // Tenta inferir resolução pela URL
      let qualityLabel = isMaster ? "Master (Multi-qualidade)" : "Fluxo";
      const matchRes = url.match(/playlist-(\d+p)/i) || url.match(/_(\d+p)/i);
      if (matchRes) {
        qualityLabel = matchRes[1].toUpperCase();
      }

      const card = document.createElement("div");
      card.className = "stream-card";

      card.innerHTML = `
        <div class="stream-info">
          <span class="quality-tag ${isMaster ? "master" : ""}">${qualityLabel}</span>
          <span style="font-size: 11px; color: #64748b;">Vídeo #${index + 1}</span>
        </div>
        <div class="url-preview" title="${url}">${url}</div>
        <div class="actions">
          <button class="btn-download" id="dl-btn-${index}">
            📥 Baixar Direto
          </button>
          <button class="btn-secondary" id="copy-btn-${index}" title="Copiar URL .m3u8">
            🔗 Link
          </button>
        </div>
      `;

      listContainer.appendChild(card);
    });

    contentDiv.innerHTML = "";
    contentDiv.appendChild(listContainer);

    // Adiciona os eventos nos botões
    streams.forEach((item, index) => {
      // Botão de Download Direto
      document.getElementById(`dl-btn-${index}`).addEventListener("click", () => {
        const downloaderUrl = chrome.runtime.getURL(
          `downloader.html?stream=${encodeURIComponent(item.url)}&title=${encodeURIComponent(currentTab.title || "aula")}`
        );
        chrome.tabs.create({ url: downloaderUrl });
      });

      // Botão de Copiar Link
      document.getElementById(`copy-btn-${index}`).addEventListener("click", () => {
        navigator.clipboard.writeText(item.url).then(() => {
          const btn = document.getElementById(`copy-btn-${index}`);
          const originalText = btn.innerText;
          btn.innerText = "Copiado!";
          setTimeout(() => { btn.innerText = originalText; }, 1500);
        });
      });
    });
  });
});
