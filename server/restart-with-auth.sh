#!/bin/bash

echo "🔄 REINICIANDO SERVIDOR CON AUTENTICACIÓN MONGODB"
echo "================================================"

# Mostrar el estado actual
echo "📊 Estado actual de PM2:"
pm2 list

echo ""
echo "🔍 Variables de entorno actuales:"
echo "NODE_ENV: $NODE_ENV"
echo "MONGODB_URI: $(echo $MONGODB_URI | sed 's/:[^:@]*@/:***@/')"

echo ""
echo "🛠️  Configurando variables de entorno:"
export NODE_ENV=production
export MONGODB_URI="mongodb://wolf:Ssaw34177234.@localhost:27017/cookies21"

echo "✅ NODE_ENV establecido a: $NODE_ENV"
echo "✅ MONGODB_URI establecido con autenticación"

echo ""
echo "🔄 Reiniciando PM2..."
pm2 restart server

echo ""
echo "📋 Nuevo estado de PM2:"
pm2 list

echo ""
echo "📄 Últimos logs del servidor:"
pm2 logs server --lines 10

echo ""
echo "🎯 Si aún hay problemas, verificar:"
echo "1. MongoDB está corriendo: sudo systemctl status mongod"
echo "2. Usuario 'wolf' existe en MongoDB"
echo "3. Contraseña es correcta"