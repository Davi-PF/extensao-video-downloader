@echo off
chcp 65001 > nul
title Conversor de Aulas (TS / MP4 / MP3)
color 0b

echo ========================================================
echo        CONVERSOR DE VÍDEOS DE AULA (FFmpeg)
echo ========================================================
echo.

:: Verifica se o FFmpeg está disponível
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] O FFmpeg não foi encontrado no PATH do sistema.
    pause
    exit /b
)

:: Se um arquivo foi arrastado e solto sobre o executável
if not "%~1"=="" (
    set "INPUT=%~1"
    goto CONVERT_SINGLE
)

:: Menu interativo para a pasta
echo [1] Converter todos os .ts para .MP4 (Vídeo sem perdas - Ultra rápido)
echo [2] Extrair áudio de todos os .ts / .mp4 para .MP3 (192kbps - Podcast)
echo [3] Ambos (Gerar .MP4 e .MP3 para todos os arquivos da pasta)
echo [4] Sair
echo.
set /p OPC="Escolha uma opção (1-4): "

if "%OPC%"=="1" goto BATCH_MP4
if "%OPC%"=="2" goto BATCH_MP3
if "%OPC%"=="3" goto BATCH_BOTH
exit /b

:BATCH_MP4
echo.
echo Processando conversão para MP4...
for %%F in (*.ts) do (
    echo Convertendo: %%F -> %%~nF.mp4
    ffmpeg -y -i "%%F" -c copy "%%~nF.mp4" -loglevel error -stats
)
echo.
echo [OK] Todos os arquivos foram convertidos para MP4!
pause
exit /b

:BATCH_MP3
echo.
echo Extraindo áudio para MP3...
for %%F in (*.ts *.mp4) do (
    if not "%%~xF"==".mp3" (
        echo Extraindo: %%F -> %%~nF.mp3
        ffmpeg -y -i "%%F" -vn -c:a libmp3lame -b:a 192k "%%~nF.mp3" -loglevel error -stats
    )
)
echo.
echo [OK] Todos os áudios foram extraídos para MP3!
pause
exit /b

:BATCH_BOTH
echo.
echo Processando MP4 e MP3...
for %%F in (*.ts) do (
    echo [1/2] Gerando MP4: %%~nF.mp4
    ffmpeg -y -i "%%F" -c copy "%%~nF.mp4" -loglevel error -stats
    echo [2/2] Extraindo MP3: %%~nF.mp3
    ffmpeg -y -i "%%F" -vn -c:a libmp3lame -b:a 192k "%%~nF.mp3" -loglevel error -stats
)
echo.
echo [OK] Processamento concluído!
pause
exit /b

:CONVERT_SINGLE
echo Arquivo selecionado: %INPUT%
echo.
echo [1] Converter para .MP4 (Vídeo)
echo [2] Extrair áudio para .MP3 (Áudio 192k)
echo [3] Ambos (.MP4 e .MP3)
echo.
set /p OPC_S="Escolha uma opção (1-3): "

if "%OPC_S%"=="1" (
    ffmpeg -y -i "%INPUT%" -c copy "%~dpn1.mp4" -loglevel error -stats
    echo [OK] Salvo como: %~dpn1.mp4
)
if "%OPC_S%"=="2" (
    ffmpeg -y -i "%INPUT%" -vn -c:a libmp3lame -b:a 192k "%~dpn1.mp3" -loglevel error -stats
    echo [OK] Salvo como: %~dpn1.mp3
)
if "%OPC_S%"=="3" (
    ffmpeg -y -i "%INPUT%" -c copy "%~dpn1.mp4" -loglevel error -stats
    ffmpeg -y -i "%INPUT%" -vn -c:a libmp3lame -b:a 192k "%~dpn1.mp3" -loglevel error -stats
    echo [OK] Processamento concluído!
)
pause
exit /b
