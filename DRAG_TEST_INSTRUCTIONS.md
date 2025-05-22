# 🧪 INSTRUCCIONES DE PRUEBA PARA DRAG & DROP

## 🎯 **PASOS PARA PROBAR LA FUNCIONALIDAD**

### **1. Crear un Contenedor**
1. Abre el editor de banner
2. Arrastra un componente "Contenedor" desde el sidebar al canvas
3. Selecciona el contenedor 
4. En el panel de propiedades, ve a la pestaña "Configuración"
5. Asegúrate de que el modo esté en "Libre" (no flex/grid)

### **2. Añadir Componentes Hijos al Contenedor**
1. Ve a la pestaña "Contenido" del contenedor
2. Haz clic en "Añadir Componente"
3. Selecciona "Texto" o "Botón" 
4. Verifica que aparezca dentro del contenedor

### **3. Verificar Logs en la Consola**
Abre las herramientas de desarrollador (F12) y revisa la consola:

#### **Logs Esperados al Crear Hijo:**
```
📦 Renderizando 1 hijos en contenedor container_123, modo: libre
🎯 useBannerEditor: Actualizando posición del hijo child_456 en contenedor container_123
```

#### **Logs Esperados al Hacer Drag:**
```
🎯 Iniciando drag child child_456 en modo libre
Child component: {id: "child_456", type: "text", ...}
Container ref: <div class="..." ...>
```

### **4. Probar Resize del Contenedor**
1. Selecciona el contenedor (no el hijo)
2. Busca el cuadradito azul en la esquina inferior derecha
3. Arrastra para redimensionar
4. **DEBE FUNCIONAR** sin problemas

#### **Logs Esperados para Resize:**
```
🔧 Click en resize handle detectado, permitiendo resize normal
```

### **5. Probar Drag de Hijo Dentro del Contenedor**
1. Haz clic en un componente hijo (texto/botón) dentro del contenedor
2. Arrastra el hijo a una nueva posición dentro del contenedor
3. **DEBE mostrar:**
   - Outline azul del contenedor
   - Fondo azul claro del contenedor 
   - El hijo se mueve suavemente

#### **Logs Esperados para Drag de Hijo:**
```
🎯 Iniciando drag child child_456 en modo libre
🎯 Finalizando drag child child_456
📍 useBannerEditor: Actualizando posición del hijo child_456...
```

### **6. ¿Qué Verificar si NO Funciona?**

#### **Si no hay componentes hijos:**
```
📦 Contenedor container_123 no tiene hijos
```
**Solución:** Crear hijos usando el botón "Añadir Componente" en el panel de contenido

#### **Si el resize no funciona:**
- ¿Aparece en consola: `🔧 Click en resize handle detectado, permitiendo resize normal`?
- Si NO aparece: El click no está llegando al resize handle
- Si SÍ aparece: Hay un problema en la función `handleResizeStart`

#### **Si el drag de hijos no funciona:**
- ¿Aparece en consola: `🎯 Iniciando drag child...`?
- Si NO aparece: El evento mouseDown no se está capturando
- Si SÍ aparece: Hay un problema en la función `updateChildPosition`

### **7. Verificar Estados Visuales**

#### **Durante Drag de Hijo:**
- ✅ Contenedor debe tener outline azul punteado
- ✅ Contenedor debe tener fondo azul claro
- ✅ Cursor debe cambiar a "grabbing"
- ✅ Hijo debe tener opacidad reducida (0.8)

#### **Después del Drag:**
- ✅ Todos los estilos visuales deben volver a normal
- ✅ El hijo debe quedarse en la nueva posición
- ✅ Panel de propiedades debe mostrar las nuevas coordenadas

### **8. Casos Edge para Probar**

1. **Drag fuera del contenedor**: El hijo debe quedarse dentro de los límites
2. **Click en resize mientras hay hijo seleccionado**: El resize debe funcionar
3. **Múltiples hijos**: Todos deben ser draggables independientemente
4. **Cambiar a modo flex/grid**: Los hijos NO deben ser draggables
5. **Hijo bloqueado**: No debe ser draggable

## 🔍 **DIAGNÓSTICO BASADO EN LOGS**

| Log | Estado | Acción |
|-----|--------|--------|
| `📦 Contenedor ... no tiene hijos` | Normal | Añadir hijos con el panel |
| `📦 Renderizando X hijos...` | ✅ Bien | Contenedor funcionando |
| `🔧 Click en resize handle detectado` | ✅ Bien | Resize debería funcionar |
| `🎯 Iniciando drag child...` | ✅ Bien | Drag está iniciando |
| Sin logs al hacer drag | ❌ Problema | Event listener no funciona |
| `📍 useBannerEditor: Actualizando posición` | ✅ Bien | Estado se actualiza |

**Si alguno de estos pasos falla, por favor comparte los logs de la consola para diagnóstico.**