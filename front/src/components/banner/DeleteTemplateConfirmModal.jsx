// /src/components/banner/DeleteTemplateConfirmModal.jsx
import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

function DeleteTemplateConfirmModal({ isOpen, onClose, onConfirm, templateName }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="p-0 bg-white rounded-md shadow-lg max-w-md mx-auto overflow-hidden">
        {/* Barra superior roja */}
        <div className="h-2 bg-red-600 w-full"></div>
        
        <AlertDialogHeader className="p-6 pb-2">
          <div className="flex items-start">
            <div className="mr-3">
              <div className="rounded-full bg-red-100 p-2 flex items-center justify-center">
                <Trash2 className="text-red-600" size={18} />
              </div>
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-xl font-semibold text-gray-800 mb-2">
                Eliminar plantilla
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                ¿Estás seguro de que deseas eliminar la plantilla <span className="font-semibold">{templateName}</span>?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="px-6 mb-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="text-amber-800 flex items-start text-sm">
              <AlertTriangle className="mr-2 flex-shrink-0 mt-0.5" size={15} />
              <span>Esta acción no se puede deshacer. La plantilla se eliminará permanentemente del sistema.</span>
            </div>
          </div>
        </div>
        
        <AlertDialogFooter className="bg-gray-50 px-6 py-4">
          <AlertDialogCancel className="px-5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md text-sm font-medium">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium flex items-center"
          >
            <Trash2 size={16} className="mr-2" />
            Eliminar plantilla
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteTemplateConfirmModal;