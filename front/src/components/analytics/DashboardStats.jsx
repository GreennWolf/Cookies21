import React from 'react';
import PropTypes from 'prop-types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js necesarios
ChartJS.register(ArcElement, Tooltip, Legend);

const DashboardStats = ({ stats }) => {
  console.log('🔍 DASHBOARD STATS RECIBIÓ: ', stats);
  
  // Si no hay estadísticas, muestra un mensaje
  if (!stats) {
    console.log('❌ DASHBOARD STATS: No hay datos disponibles');
    return <div className="text-center text-gray-500 p-6">No hay datos disponibles.</div>;
  }
  
  // Garantizar que todos los valores requeridos existan para evitar errores
  const safeStats = {
    totalVisits: stats.totalVisits || 0,
    uniqueVisitors: stats.uniqueVisitors || 0,
    avgAcceptanceRate: stats.avgAcceptanceRate || 0,
    avgRejectionRate: stats.avgRejectionRate || 0,
    avgCustomizationRate: stats.avgCustomizationRate || 0,
    avgCloseRate: stats.avgCloseRate || 0,
    avgNoInteractionRate: stats.avgNoInteractionRate || 0,
    avgTimeToDecision: stats.avgTimeToDecision || 0,
    avgTimeInPreferences: stats.avgTimeInPreferences || 0,
    visitsByRegulation: stats.visitsByRegulation || {
      gdpr: 0,
      ccpa: 0,
      lgpd: 0,
      other: 0
    }
  };
  
  console.log('✅ DASHBOARD STATS NORMALIZADO: ', safeStats);
  
  // Preparar datos para el gráfico de interacciones
  const interactionChartData = {
    labels: ['Aceptar Todo', 'Rechazar Todo', 'Personalizar', 'Cerrar', 'Sin Interacción'],
    datasets: [
      {
        label: 'Interacciones con el banner',
        data: [
          // Los valores ya vienen como porcentajes (0-100) del backend
          safeStats.avgAcceptanceRate, 
          safeStats.avgRejectionRate, 
          safeStats.avgCustomizationRate,
          safeStats.avgCloseRate,
          safeStats.avgNoInteractionRate
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Opciones del gráfico
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value.toFixed(2)}%`;
          }
        }
      }
    }
  };

  // Formatear números para mejor legibilidad
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat().format(Math.round(num));
  };

  // Formatear porcentajes
  const formatPercentage = (value) => {
    if (value === undefined || value === null) return '0%';
    
    console.log(`🔢 Formateando porcentaje: ${value} (tipo: ${typeof value})`);
    
    // Asegurar que es un número y formatear
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    
    if (isNaN(numValue)) {
      console.warn(`⚠️ Valor de porcentaje no es un número: ${value}`);
      return '0%';
    }
    
    return `${numValue.toFixed(2)}%`;
  };

  // Formatear tiempo en milisegundos a segundos
  const formatTime = (ms) => {
    if (ms === undefined || ms === null) return '0s';
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Visitas Totales</h3>
          <p className="text-3xl font-bold text-[#235C88]">{formatNumber(safeStats.totalVisits)}</p>
        </div>
        
        <div className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Visitantes Únicos</h3>
          <p className="text-3xl font-bold text-[#235C88]">{formatNumber(safeStats.uniqueVisitors)}</p>
        </div>
        
        <div className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Tasa de Aceptación</h3>
          <p className="text-3xl font-bold" style={{ color: 'rgba(75, 192, 192, 1)' }}>{formatPercentage(safeStats.avgAcceptanceRate)}</p>
        </div>
        
        <div className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Tasa de Rechazo</h3>
          <p className="text-3xl font-bold" style={{ color: 'rgba(255, 99, 132, 1)' }}>{formatPercentage(safeStats.avgRejectionRate)}</p>
        </div>
        
        <div className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Tasa de Personalización</h3>
          <p className="text-3xl font-bold" style={{ color: 'rgba(54, 162, 235, 1)' }}>{formatPercentage(safeStats.avgCustomizationRate)}</p>
        </div>
      </div>
      
      {/* Gráfico de interacciones */}
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-medium text-gray-600 mb-4">Distribución de Interacciones</h3>
        <div className="h-64">
          <Doughnut data={interactionChartData} options={chartOptions} />
        </div>
      </div>
      
      {/* Métricas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-medium text-gray-600 mb-4">Tiempo Promedio</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Tiempo hasta decisión:</span>
              <span className="font-medium text-[#235C88] text-lg">{formatTime(safeStats.avgTimeToDecision)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Tiempo en preferencias:</span>
              <span className="font-medium text-[#235C88] text-lg">{formatTime(safeStats.avgTimeInPreferences)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-medium text-gray-600 mb-4">Por Regulación</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">GDPR:</span>
              <span className="font-medium text-[#235C88] text-lg">{formatNumber(safeStats.visitsByRegulation.gdpr)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">CCPA:</span>
              <span className="font-medium text-[#235C88] text-lg">{formatNumber(safeStats.visitsByRegulation.ccpa)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">LGPD:</span>
              <span className="font-medium text-[#235C88] text-lg">{formatNumber(safeStats.visitsByRegulation.lgpd)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Otras:</span>
              <span className="font-medium text-[#235C88] text-lg">{formatNumber(safeStats.visitsByRegulation.other)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

DashboardStats.propTypes = {
  stats: PropTypes.object
};

export default DashboardStats;