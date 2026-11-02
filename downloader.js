// Elementos da interface
const filenameInput = document.getElementById("filename");
const formatSelect = document.getElementById("format-select");
const streamUrlDisplay = document.getElementById("stream-url-display");
const qualityGroup = document.getElementById("quality-group");
const qualitySelect = document.getElementById("quality-select");
const progressSection = document.getElementById("progress-section");
const progressBar = document.getElementById("progress-bar");
const segmentsStat = document.getElementById("segments-stat");
const sizeStat = document.getElementById("size-stat");
const statusText = document.getElementById("status-text");
const btnStart = document.getElementById("btn-start");
const btnCancel = document.getElementById("btn-cancel");

// Extrai os parâmetros da URL
const params = new URLSearchParams(window.location.search);
const initialStreamUrl = params.get("stream");
const initialTitle = params.get("title") || "aula_video";

let isCancelled = false;
let isDownloading = false;

// Sanitiza o nome do arquivo para o sistema de arquivos
function sanitizeFilename(name) {
  let clean = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
  clean = clean.replace(/\s+/g, " ");
  clean = clean.replace(/\.(ts|mp4|m3u8)$/i, "");
  return clean || "aula_video";
}

// Configura nome inicial com base no formato selecionado
const cleanBaseName = sanitizeFilename(initialTitle);
filenameInput.value = `${cleanBaseName}.${formatSelect.value}`;
streamUrlDisplay.innerText = initialStreamUrl || "Nenhum link fornecido.";

// Atualiza a extensão do arquivo quando o usuário troca o formato
formatSelect.addEventListener("change", () => {
  const currentExt = formatSelect.value;
  const currentName = filenameInput.value.replace(/\.(ts|mp4)$/i, "");
  filenameInput.value = `${currentName}.${currentExt}`;
});

// Resolve URLs relativas preservando query parameters de autenticação (como sjwt)
function resolveUrl(relativeOrAbsolute, baseUrl) {
  const baseObj = new URL(baseUrl);
  const resolved = new URL(relativeOrAbsolute, baseUrl);
  
  if (!resolved.search && baseObj.search) {
    resolved.search = baseObj.search;
  }
  return resolved.href;
}

// Analisa Playlist Mestre (Multivariant)
function parseMasterPlaylist(content, masterUrl) {
  const lines = content.split(/\r?\n/);
  const variants = [];
  let currentInfo = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const bwMatch = line.match(/BANDWIDTH=(\d+)/);
      const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
      currentInfo = {
        bandwidth: bwMatch ? parseInt(bwMatch[1], 10) : 0,
        resolution: resMatch ? resMatch[1] : "",
      };
    } else if (!line.startsWith("#") && currentInfo) {
      currentInfo.url = resolveUrl(line, masterUrl);
      variants.push(currentInfo);
      currentInfo = null;
    }
  }
  return variants;
}

// Analisa Playlist de Mídia (Segmentos .ts)
function parseMediaPlaylist(content, mediaUrl) {
  const lines = content.split(/\r?\n/);
  const segments = [];
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    segments.push(resolveUrl(line, mediaUrl));
  }
  return segments;
}

// Transmuta fragmentos MPEG-TS para container MP4 usando mux.js
function transmuxTsToMp4(buffers) {
  return new Promise((resolve, reject) => {
    try {
      if (typeof muxjs === "undefined") {
        throw new Error("Biblioteca mux.js não carregada.");
      }

      const transmuxer = new muxjs.mp4.Transmuxer({ keepOriginalTimestamps: true });
      const remuxedSegments = [];
      const remuxedInitSegments = [];

      transmuxer.on("data", (segment) => {
        if (segment.initSegment) {
          remuxedInitSegments.push(segment.initSegment);
        }
        remuxedSegments.push(segment.data);
      });

      transmuxer.on("done", () => {
        const initSeg = remuxedInitSegments[0] || new Uint8Array();
        const totalBytes = initSeg.byteLength + remuxedSegments.reduce((sum, seg) => sum + seg.byteLength, 0);
        const combined = new Uint8Array(totalBytes);
        combined.set(initSeg, 0);

        let offset = initSeg.byteLength;
        for (const seg of remuxedSegments) {
          combined.set(seg, offset);
          offset += seg.byteLength;
        }

        resolve(new Blob([combined], { type: "video/mp4" }));
      });

      for (let i = 0; i < buffers.length; i++) {
        transmuxer.push(new Uint8Array(buffers[i]));
        transmuxer.flush();
      }
      transmuxer.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Prepara a playlist ao carregar a página
async function initPlaylist() {
  if (!initialStreamUrl) {
    statusText.innerText = "URL do stream inválida.";
    btnStart.disabled = true;
    return;
  }

  try {
    statusText.innerText = "Inspecionando lista de reprodução...";
    const res = await fetch(initialStreamUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    if (text.includes("#EXT-X-STREAM-INF")) {
      const variants = parseMasterPlaylist(text, initialStreamUrl);
      if (variants.length > 0) {
        variants.sort((a, b) => b.bandwidth - a.bandwidth);

        qualitySelect.innerHTML = "";
        variants.forEach((v) => {
          const opt = document.createElement("option");
          opt.value = v.url;
          const mbps = (v.bandwidth / 1000000).toFixed(1);
          opt.innerText = `${v.resolution || "Qualidade"} (${mbps} Mbps)`;
          qualitySelect.appendChild(opt);
        });

        qualityGroup.style.display = "block";
        statusText.innerText = `Playlist Master detectada (${variants.length} qualidades disponíveis).`;
      }
    } else {
      statusText.innerText = "Playlist pronta para download.";
    }
  } catch (err) {
    console.error(err);
    statusText.innerText = `Erro ao ler playlist: ${err.message}.`;
  }
}

// Inicia o processo de download
async function startDownload() {
  if (isDownloading) return;

  isDownloading = true;
  isCancelled = false;
  btnStart.disabled = true;
  btnCancel.style.display = "inline-block";
  progressSection.style.display = "block";

  let targetMediaUrl = initialStreamUrl;
  if (qualityGroup.style.display !== "none" && qualitySelect.value) {
    targetMediaUrl = qualitySelect.value;
  }

  try {
    statusText.innerText = "Buscando fragmentos de vídeo...";
    const res = await fetch(targetMediaUrl);
    if (!res.ok) throw new Error(`Falha ao obter lista: HTTP ${res.status}`);
    const playlistText = await res.text();

    const segments = parseMediaPlaylist(playlistText, targetMediaUrl);
    if (segments.length === 0) {
      throw new Error("Nenhum segmento .ts encontrado na playlist informada.");
    }

    segmentsStat.innerText = `Segmentos: 0 / ${segments.length}`;
    sizeStat.innerText = "0 MB";

    const CONCURRENCY = 4;
    const buffers = new Array(segments.length);
    let completed = 0;
    let totalBytes = 0;
    let nextIndex = 0;

    async function downloadWorker() {
      while (nextIndex < segments.length && !isCancelled) {
        const index = nextIndex++;
        const segmentUrl = segments[index];

        let success = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (isCancelled) break;
          try {
            const segRes = await fetch(segmentUrl);
            if (!segRes.ok) throw new Error(`HTTP ${segRes.status}`);
            const buf = await segRes.arrayBuffer();
            buffers[index] = buf;
            totalBytes += buf.byteLength;
            completed++;

            const percent = ((completed / segments.length) * 100).toFixed(1);
            progressBar.style.width = `${percent}%`;
            segmentsStat.innerText = `Segmentos: ${completed} / ${segments.length} (${percent}%)`;
            sizeStat.innerText = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
            statusText.innerText = `Baixando fragmentos... (${completed}/${segments.length})`;

            success = true;
            break;
          } catch (err) {
            if (attempt === 3) throw err;
            await new Promise((r) => setTimeout(r, 800));
          }
        }

        if (!success && !isCancelled) {
          throw new Error(`Falha ao baixar o segmento ${index + 1}.`);
        }
      }
    }

    const workerPool = Array.from(
      { length: Math.min(CONCURRENCY, segments.length) },
      () => downloadWorker()
    );

    await Promise.all(workerPool);

    if (isCancelled) {
      statusText.innerText = "Download cancelado pelo usuário.";
      btnStart.disabled = false;
      btnCancel.style.display = "none";
      isDownloading = false;
      return;
    }

    let finalBlob;
    const selectedFormat = formatSelect.value;
    let finalFilename = filenameInput.value.trim() || `aula_video.${selectedFormat}`;

    if (selectedFormat === "mp4") {
      statusText.innerText = "Transmuxando para MP4 sem perda de qualidade...";
      try {
        finalBlob = await transmuxTsToMp4(buffers);
      } catch (transmuxErr) {
        console.warn("Falha no transmuxing MP4, salvando como TS:", transmuxErr);
        statusText.innerText = "Aviso: Transmuxing falhou, salvando como formato original .ts...";
        finalBlob = new Blob(buffers, { type: "video/mp2t" });
        finalFilename = finalFilename.replace(/\.mp4$/i, ".ts");
      }
    } else {
      statusText.innerText = "Montando arquivo TS original...";
      finalBlob = new Blob(buffers, { type: "video/mp2t" });
    }

    const downloadBlobUrl = URL.createObjectURL(finalBlob);
    statusText.innerText = "Salvando arquivo no computador...";

    chrome.downloads.download({
      url: downloadBlobUrl,
      filename: finalFilename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        const a = document.createElement("a");
        a.href = downloadBlobUrl;
        a.download = finalFilename;
        a.click();
      }
      statusText.innerText = `✅ Sucesso! Salvo como: ${finalFilename}`;
      progressBar.style.width = "100%";
      btnStart.disabled = false;
      btnCancel.style.display = "none";
      isDownloading = false;
    });

  } catch (err) {
    console.error(err);
    statusText.innerText = `❌ Erro durante o download: ${err.message}`;
    btnStart.disabled = false;
    btnCancel.style.display = "none";
    isDownloading = false;
  }
}

// Botões de ação
btnStart.addEventListener("click", startDownload);
btnCancel.addEventListener("click", () => {
  isCancelled = true;
});

// Inicialização
initPlaylist();
