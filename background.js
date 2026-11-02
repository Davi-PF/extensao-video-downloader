// Armazena URLs encontradas por aba: { tabId: Array<{ url: string, time: number }> }
const streamMap = {};

// Escuta requisições de rede para encontrar playlists .m3u8
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const { tabId, url } = details;
    if (tabId < 0) return;

    // Filtra apenas requisições que contenham .m3u8
    if (!url.includes(".m3u8")) return;

    if (!streamMap[tabId]) {
      streamMap[tabId] = [];
    }

    // Evita duplicar o mesmo stream na lista
    const alreadyExists = streamMap[tabId].some((item) => item.url === url);
    if (!alreadyExists) {
      streamMap[tabId].push({
        url: url,
        time: Date.now()
      });

      // Atualiza o contador de vídeos no badge da extensão
      const count = streamMap[tabId].length;
      chrome.action.setBadgeText({ tabId, text: String(count) });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#2563eb" });
    }
  },
  { urls: ["*://*/*.m3u8*"] }
);

// Limpeza quando a aba for fechada
chrome.tabs.onRemoved.addListener((tabId) => {
  delete streamMap[tabId];
});

// Limpeza quando a página for recarregada ou navegar para outra URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    delete streamMap[tabId];
    chrome.action.setBadgeText({ tabId, text: "" });
  }
});

// Comunicação com o popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getStreams") {
    sendResponse({ streams: streamMap[request.tabId] || [] });
  }
  return true;
});
