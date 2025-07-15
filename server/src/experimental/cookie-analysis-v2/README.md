# Cookie Analysis System V2 - Entorno de Pruebas

## 🎯 Objetivo
Entorno experimental para probar el nuevo sistema de análisis de cookies antes de integrarlo al sistema principal.

## 📁 Estructura
```
cookie-analysis-v2/
├── controllers/     # Controladores experimentales
├── services/        # Servicios del nuevo sistema
├── models/          # Modelos de datos V2
├── routes/          # Rutas experimentales
├── utils/           # Utilidades y herramientas
└── test-data/       # Datos de prueba
```

## 🔗 Endpoints
- `GET /api/v1/experimental/cookie-analysis/scan/:domain` - Escanear dominio
- `GET /api/v1/experimental/cookie-analysis/compare/:domain` - Comparar sistemas
- `GET /api/v1/experimental/cookie-analysis/report/:scanId` - Obtener reporte

## 🧪 Estado
- [ ] Scanner avanzado
- [ ] Clasificador ML
- [ ] Detector de vendors
- [ ] Interfaz de comparación
- [ ] Generador de reportes