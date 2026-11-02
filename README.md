# 🎬 HLS Video Downloader & Converter

Extensão para Google Chrome (Manifest V3) desenvolvida para detectar e baixar transmissões HLS (`.m3u8`) diretamente pelo navegador, com suporte a **download direto em MP4**, além de um utilitário para extração de áudio em **MP3** via FFmpeg.

---

## ✨ Funcionalidades

- **Detecção Automática:** Escuta as requisições de rede da aba ativa e identifica manifestos `.m3u8` ao dar play no vídeo.
- **Suporte a Playlist Master:** Identifica transmissões com múltiplas qualidades e seleciona automaticamente a maior resolução disponível (1080p, 720p, etc.).
- **Download Acelerado no Navegador:** Faz requisições paralelas (4 conexões simultâneas) dos fragmentos `.ts` com reconexão automática em caso de falha.
- **Transmuxing Instantâneo para MP4:** Empacota os fragmentos em formato `.mp4` diretamente pelo navegador através do `mux.js`, sem perda de qualidade e em poucos segundos.
- **Persistência de Autenticação:** Preserva tokens de autenticação (ex: JWT `sjwt=...`, `uid=...`) nos fragmentos da CDN (compatível com Spalla, Sambatech, CloudFront, etc.).
- **Conversor Integrado (MP3 & MP4):** Script `converter.bat` incluso para extrair áudio em MP3 (192kbps) ou converter arquivos `.ts` em lote com 1 clique.

---

## 📁 Estrutura do Projeto

```text
extensao-video-downloader/
├── manifest.json       # Configuração da extensão Manifest V3
├── background.js       # Service worker para interceptar requisições de rede
├── popup.html          # Interface do popup ao clicar no ícone da extensão
├── popup.js            # Lógica de exibição das aulas encontradas
├── downloader.html     # Página dedicada de download com progresso visual
├── downloader.js       # Motor de download concorrente e montagem
├── mux.min.js          # Biblioteca para transmuxing TS -> MP4 no navegador
├── converter.bat       # Script utilitário para conversão em lote / extração de MP3
├── .gitignore          # Arquivos de mídia e sistema ignorados no Git
└── README.md           # Documentação do projeto
```

---

## 🚀 Como Instalar a Extensão no Chrome

1. Abra o Google Chrome e acesse:
   ```text
   chrome://extensions/
   ```
2. No canto superior direito, ative a opção **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** (canto superior esquerdo).
4. Selecione esta pasta:
   ```text
   D:\Projetos\extensao-video-downloader
   ```
5. A extensão estará pronta e visível na barra de extensões do Chrome.

---

## 💡 Como Usar

1. Acesse o portal de aulas ou vídeo desejado.
2. Dê **play** no vídeo por alguns segundos.
3. O ícone da extensão exibirá um número indicando os vídeos encontrados.
4. Clique no ícone da extensão e depois no botão **📥 Baixar Direto**.
5. Uma aba será aberta mostrando o progresso em tempo real e permitindo escolher entre:
   - **MP4 (.mp4):** Arquivo de vídeo universal transmuxado no navegador.
   - **TS (.ts):** Arquivo original dos fragmentos HLS.
6. Ao terminar, o download nativo do Chrome salvará o arquivo na sua pasta de Downloads.

---

## 🎵 Como Converter para MP3 ou MP4 com o `converter.bat`

O projeto inclui o script `converter.bat` que utiliza o FFmpeg nativo do Windows:

- **Arrastar e Soltar:** Basta arrastar qualquer arquivo `.ts` ou `.mp4` para cima do arquivo `converter.bat`.
- **Modo Pasta / Em Lote:** Dê dois cliques em `converter.bat` para converter todos os vídeos da pasta de uma vez só:
  - `[1]` Converter todos para **MP4** (ultra rápido, sem re-codificação).
  - `[2]` Extrair áudio para **MP3** (192kbps, ideal para ouvir como podcast).
  - `[3]` Gerar **ambos** (MP4 + MP3).
