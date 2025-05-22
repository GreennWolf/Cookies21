import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FaGlobeAmericas, FaMobileAlt, FaDesktop, FaTablet, FaChrome, FaFirefox, FaSafari, FaEdge, FaWindows, FaApple, FaAndroid, FaLinux } from 'react-icons/fa';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

const DemographicsChart = ({ data }) => {
  const [activeMetric, setActiveMetric] = useState('visits'); // 'visits' o 'acceptanceRate'
  const [itemLimit, setItemLimit] = useState(10); // Límite de elementos a mostrar
  
  if (!data) {
    return (
      <div className="bg-white p-6 rounded shadow text-center text-gray-500">
        No hay datos demográficos disponibles. Verifica el rango de fechas seleccionado o la configuración del dominio.
      </div>
    );
  }

  // Destructurar los datos con valores por defecto si no existen
  const { 
    countries = [], 
    devices = [], 
    browsers = [], 
    platforms = [] 
  } = data;

  // Ordenar datos por visitas (descendente)
  const sortedCountries = [...countries].sort((a, b) => b.visits - a.visits).slice(0, itemLimit);
  const sortedBrowsers = [...browsers].sort((a, b) => b.visits - a.visits).slice(0, itemLimit);

  // Función para obtener el color según el índice con transparencia variable
  const getColor = (index, alpha = 0.8) => {
    const colors = [
      `rgba(54, 162, 235, ${alpha})`,  // Azul
      `rgba(75, 192, 192, ${alpha})`,  // Verde azulado
      `rgba(255, 99, 132, ${alpha})`,  // Rosa
      `rgba(255, 206, 86, ${alpha})`,  // Amarillo
      `rgba(153, 102, 255, ${alpha})`, // Púrpura
      `rgba(255, 159, 64, ${alpha})`,  // Naranja
      `rgba(199, 199, 199, ${alpha})`, // Gris
      `rgba(83, 102, 255, ${alpha})`,  // Azul indigo
      `rgba(78, 205, 196, ${alpha})`,  // Verde menta
      `rgba(255, 126, 54, ${alpha})`   // Naranja brillante
    ];
    return colors[index % colors.length];
  };

  // Colores específicos para dispositivos
  const deviceColors = {
    desktop: 'rgba(54, 162, 235, 0.8)', // Azul
    mobile: 'rgba(255, 99, 132, 0.8)',  // Rosa
    tablet: 'rgba(75, 192, 192, 0.8)',  // Verde azulado
    other: 'rgba(199, 199, 199, 0.8)'   // Gris
  };

  // Colores específicos para plataformas
  const platformColors = {
    windows: 'rgba(54, 162, 235, 0.8)',  // Azul
    macos: 'rgba(153, 102, 255, 0.8)',   // Púrpura
    linux: 'rgba(255, 159, 64, 0.8)',    // Naranja
    ios: 'rgba(75, 192, 192, 0.8)',      // Verde azulado
    android: 'rgba(255, 99, 132, 0.8)',  // Rosa
    other: 'rgba(199, 199, 199, 0.8)'    // Gris
  };

  // Función para capitalizar primera letra
  const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Obtener el icono correspondiente para los dispositivos
  const getDeviceIcon = (type) => {
    switch(type.toLowerCase()) {
      case 'desktop': return <FaDesktop className="text-blue-500" />;
      case 'mobile': return <FaMobileAlt className="text-pink-500" />;
      case 'tablet': return <FaTablet className="text-teal-500" />;
      default: return <FaDesktop className="text-gray-500" />;
    }
  };

  // Obtener el icono correspondiente para los navegadores
  const getBrowserIcon = (name) => {
    switch(name.toLowerCase()) {
      case 'chrome': return <FaChrome className="text-green-500" />;
      case 'firefox': return <FaFirefox className="text-orange-500" />;
      case 'safari': return <FaSafari className="text-blue-500" />;
      case 'edge': return <FaEdge className="text-blue-700" />;
      default: return <FaGlobeAmericas className="text-gray-500" />;
    }
  };

  // Obtener el icono correspondiente para las plataformas
  const getPlatformIcon = (name) => {
    switch(name.toLowerCase()) {
      case 'windows': return <FaWindows className="text-blue-500" />;
      case 'macos': return <FaApple className="text-gray-800" />;
      case 'ios': return <FaApple className="text-gray-500" />;
      case 'android': return <FaAndroid className="text-green-500" />;
      case 'linux': return <FaLinux className="text-yellow-500" />;
      default: return <FaDesktop className="text-gray-500" />;
    }
  };

  // Preparar datos para el gráfico de países
  const countriesChartData = {
    labels: sortedCountries.map(country => country.name),
    datasets: [
      {
        label: activeMetric === 'visits' ? 'Visitas' : 'Tasa de Aceptación (%)',
        data: sortedCountries.map(country => 
          activeMetric === 'visits' ? country.visits : country.acceptanceRate
        ),
        backgroundColor: sortedCountries.map((_, i) => getColor(i)),
        borderColor: sortedCountries.map((_, i) => getColor(i, 1)),
        borderWidth: 1,
      },
    ],
  };

  // Preparar datos para el gráfico de dispositivos
  const devicesChartData = {
    labels: devices.map(device => capitalize(device.type)),
    datasets: [
      {
        label: activeMetric === 'visits' ? 'Visitas' : 'Tasa de Aceptación (%)',
        data: devices.map(device => 
          activeMetric === 'visits' ? device.visits : device.acceptanceRate
        ),
        backgroundColor: devices.map(device => deviceColors[device.type] || deviceColors.other),
        borderColor: devices.map(device => (deviceColors[device.type] || deviceColors.other).replace('0.8', '1')),
        borderWidth: 1,
      },
    ],
  };

  // Preparar datos para el gráfico de navegadores
  const browsersChartData = {
    labels: sortedBrowsers.map(browser => `${capitalize(browser.name)} ${browser.version}`),
    datasets: [
      {
        label: activeMetric === 'visits' ? 'Visitas' : 'Tasa de Aceptación (%)',
        data: sortedBrowsers.map(browser => 
          activeMetric === 'visits' ? browser.visits : browser.acceptanceRate
        ),
        backgroundColor: sortedBrowsers.map((_, i) => getColor(i)),
        borderColor: sortedBrowsers.map((_, i) => getColor(i, 1)),
        borderWidth: 1,
      },
    ],
  };

  // Preparar datos para el gráfico de plataformas
  const platformsChartData = {
    labels: platforms.map(platform => capitalize(platform.name)),
    datasets: [
      {
        label: activeMetric === 'visits' ? 'Visitas' : 'Tasa de Aceptación (%)',
        data: platforms.map(platform => 
          activeMetric === 'visits' ? platform.visits : platform.acceptanceRate
        ),
        backgroundColor: platforms.map(platform => platformColors[platform.name.toLowerCase()] || platformColors.other),
        borderColor: platforms.map(platform => (platformColors[platform.name.toLowerCase()] || platformColors.other).replace('0.8', '1')),
        borderWidth: 1,
      },
    ],
  };

  // Opciones para gráfico de barras
  const getBarOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 14,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            if (activeMetric === 'acceptanceRate') {
              return `${label}: ${value.toFixed(2)}%`;
            }
            return `${label}: ${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ...(activeMetric === 'acceptanceRate' && { max: 100 }),
        title: {
          display: true,
          text: activeMetric === 'visits' ? 'Visitas' : 'Tasa de Aceptación (%)',
          font: {
            weight: 'bold'
          }
        },
        ticks: {
          callback: function(value) {
            if (activeMetric === 'acceptanceRate') {
              return value + '%';
            }
            return value.toLocaleString();
          }
        }
      },
      x: {
        title: {
          display: true,
          text: title.split(' ')[1], // Extrae "País", "Dispositivo", etc.
          font: {
            weight: 'bold'
          }
        },
        grid: {
          display: false
        }
      }
    }
  });

  // Formato de números con separador de miles
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="space-y-6">
      {/* Panel de control y filtros */}
      <div className="bg-white p-6 rounded shadow">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">Tipo de Datos a Mostrar</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveMetric('visits')}
                className={`px-4 py-2 rounded-full ${
                  activeMetric === 'visits'
                    ? 'bg-[#235C88] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                Visitas
              </button>
              <button
                onClick={() => setActiveMetric('acceptanceRate')}
                className={`px-4 py-2 rounded-full ${
                  activeMetric === 'acceptanceRate'
                    ? 'bg-[#235C88] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                Tasa de Aceptación
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">Elementos a Mostrar</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setItemLimit(5)}
                className={`px-4 py-2 rounded-full ${
                  itemLimit === 5
                    ? 'bg-[#235C88] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                Top 5
              </button>
              <button
                onClick={() => setItemLimit(10)}
                className={`px-4 py-2 rounded-full ${
                  itemLimit === 10
                    ? 'bg-[#235C88] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                Top 10
              </button>
              <button
                onClick={() => setItemLimit(20)}
                className={`px-4 py-2 rounded-full ${
                  itemLimit === 20
                    ? 'bg-[#235C88] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                Top 20
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-gray-600">Total Visitas</h3>
            <span className="text-2xl text-blue-500">
              <FaGlobeAmericas />
            </span>
          </div>
          <p className="text-3xl font-bold text-[#235C88]">
            {formatNumber(countries.reduce((sum, item) => sum + item.visits, 0))}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-gray-600">Países</h3>
            <span className="text-2xl text-green-500">
              <FaGlobeAmericas />
            </span>
          </div>
          <p className="text-3xl font-bold text-[#235C88]">{countries.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-gray-600">Navegadores</h3>
            <span className="text-2xl text-orange-500">
              <FaChrome />
            </span>
          </div>
          <p className="text-3xl font-bold text-[#235C88]">{browsers.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-gray-600">Dispositivos</h3>
            <span className="text-2xl text-purple-500">
              <FaMobileAlt />
            </span>
          </div>
          <p className="text-3xl font-bold text-[#235C88]">{devices.length}</p>
        </div>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de países */}
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-medium text-gray-600 mb-3 flex items-center">
            <FaGlobeAmericas className="mr-2 text-blue-500" />
            Por País (Top {itemLimit})
          </h3>
          <div className="h-72">
            <Bar 
              data={countriesChartData} 
              options={getBarOptions('Distribución por País')} 
            />
          </div>
        </div>
        
        {/* Gráfico de dispositivos */}
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-medium text-gray-600 mb-3 flex items-center">
            <FaMobileAlt className="mr-2 text-pink-500" />
            Por Tipo de Dispositivo
          </h3>
          <div className="h-72">
            <Bar 
              data={devicesChartData} 
              options={getBarOptions('Distribución por Dispositivo')} 
            />
          </div>
        </div>
        
        {/* Gráfico de navegadores */}
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-medium text-gray-600 mb-3 flex items-center">
            <FaChrome className="mr-2 text-green-500" />
            Por Navegador (Top {itemLimit})
          </h3>
          <div className="h-72">
            <Bar 
              data={browsersChartData} 
              options={getBarOptions('Distribución por Navegador')} 
            />
          </div>
        </div>
        
        {/* Gráfico de plataformas */}
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-medium text-gray-600 mb-3 flex items-center">
            <FaWindows className="mr-2 text-blue-500" />
            Por Sistema Operativo
          </h3>
          <div className="h-72">
            <Bar 
              data={platformsChartData} 
              options={getBarOptions('Distribución por Sistema')} 
            />
          </div>
        </div>
      </div>
      
      {/* Tablas de datos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de países */}
        <div className="bg-white p-6 rounded shadow overflow-x-auto">
          <h3 className="text-lg font-medium text-gray-600 mb-4 flex items-center">
            <FaGlobeAmericas className="mr-2 text-blue-500" />
            Datos por País
          </h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  País
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visitas
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aceptación
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {countries.slice(0, itemLimit).map((country, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900 flex items-center">
                        {country.code && 
                          <span className="mr-2 text-xl">{country.code === 'unknown' ? '🌍' : getCountryFlag(country.code)}</span>
                        }
                        {country.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(country.visits)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${country.acceptanceRate}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-500">{country.acceptanceRate?.toFixed(2)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Tabla de dispositivos y plataformas */}
        <div className="bg-white p-6 rounded shadow overflow-x-auto">
          <h3 className="text-lg font-medium text-gray-600 mb-4 flex items-center">
            <FaDesktop className="mr-2 text-gray-600" />
            Datos por Dispositivo y Sistema
          </h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visitas
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aceptación
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.map((device, index) => (
                <tr key={`device-${index}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="mr-2">{getDeviceIcon(device.type)}</span>
                      <span className="font-medium text-gray-900">{capitalize(device.type)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(device.visits)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${device.acceptanceRate}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-500">{device.acceptanceRate?.toFixed(2)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              
              {platforms.map((platform, index) => (
                <tr key={`platform-${index}`} className="hover:bg-gray-50 bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="mr-2">{getPlatformIcon(platform.name)}</span>
                      <span className="font-medium text-gray-900">{capitalize(platform.name)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(platform.visits)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-green-500 h-2.5 rounded-full" 
                          style={{ width: `${platform.acceptanceRate}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-500">{platform.acceptanceRate?.toFixed(2)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Tabla de navegadores */}
      <div className="bg-white p-6 rounded shadow overflow-x-auto">
        <h3 className="text-lg font-medium text-gray-600 mb-4 flex items-center">
          <FaChrome className="mr-2 text-green-500" />
          Datos por Navegador
        </h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Navegador
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Versión
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visitas
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aceptación
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {browsers.slice(0, itemLimit).map((browser, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="mr-2">{getBrowserIcon(browser.name)}</span>
                    <span className="font-medium text-gray-900">{capitalize(browser.name)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {browser.version}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatNumber(browser.visits)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${browser.acceptanceRate}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-500">{browser.acceptanceRate?.toFixed(2)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Función auxiliar para obtener la bandera de un país por su código
function getCountryFlag(countryCode) {
  if (!countryCode || countryCode === 'unknown') return '🌍';
  
  // Convertir código de país en emoji de bandera
  // Los códigos regionales son letras Unicode mayúsculas, así que convertimos las letras
  // del código ISO a los puntos de código correspondientes para banderas regionales
  const codePoints = [...countryCode.toUpperCase()]
    .map(char => 127397 + char.charCodeAt(0));
  
  // Convierte puntos de código a emoji
  return String.fromCodePoint(...codePoints);
}

DemographicsChart.propTypes = {
  data: PropTypes.shape({
    countries: PropTypes.array,
    devices: PropTypes.array,
    browsers: PropTypes.array,
    platforms: PropTypes.array
  })
};

export default DemographicsChart;