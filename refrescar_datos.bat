@echo off
chcp 65001 >nul
echo ========================================
echo  SISTEMA PRM VALVERDE - REFRESCAR DATOS
echo ========================================
echo.
echo Actualizando datos desde Supabase...
echo.

cd /d "%~dp0"
node exportar_powerbi_v2.js

echo.
echo ========================================
echo   COMPLETADO. Vuelve a Power BI y haz
echo   "Actualizar" en cada tabla.
echo ========================================
pause