// /src/components/banner/Editor/hooks/useDragAndDrop.js
import { useCallback } from 'react';

export function useDragAndDrop() {
  const onDragStart = useCallback((item) => {
    console.log('Iniciando arrastre del item:', item);
  }, []);

  const onDrop = useCallback((dropZone) => {
    console.log('Item soltado en:', dropZone);
  }, []);

  return { onDragStart, onDrop };
}
