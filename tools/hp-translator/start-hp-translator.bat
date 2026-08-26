@echo off
title HP-Translator Server
cd /d %~dp0\..\..
node tools/hp-translator/server.mjs
