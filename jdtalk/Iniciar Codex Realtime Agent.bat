@echo off
setlocal
cd /d "D:\JD-CRED-VIP\JD_TALK_V01\jdtalk-main\agent-runtime"
echo ===============================
echo  Codex Realtime Agent (Dev)
echo ===============================
echo Ambiente: %NODE_ENV%
echo Diret?rio: %CD%
echo.
call npm run dev:agent
echo.
echo Processo finalizado. Pressione qualquer tecla para fechar...
pause >nul
endlocal

