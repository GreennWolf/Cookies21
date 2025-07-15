import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const CookieAnalysisV2Results = ({ analysisResult, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Analizando cookies con sistema V2...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Error en análisis V2: {error.message || 'Error desconocido'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!analysisResult || !analysisResult.data) {
    return null;
  }

  // Debug: ver qué estructura está llegando
  console.log('🔍 CookieAnalysisV2Results - Estructura de datos:', analysisResult.data);

  const { 
    analysis = {}, 
    summary = {}, 
    compliance = {}, 
    privacy = {},
    scanId,
    domain,
    metadata = {},
    technologies = [],
    riskAssessment = {},
    recommendations = []
  } = analysisResult.data;

  // Si no hay analysis.cookies, intentar usar summary o otra estructura
  const cookies = analysis.cookies || summary.cookies || [];
  const vendors = analysis.vendors || summary.vendors || [];
  const detectionMethods = analysis.detectionMethods || metadata.detectionMethods || [];

  const getComplianceIcon = (status) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'non_compliant': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'partially_compliant': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'strictly_necessary': 'bg-green-100 text-green-800',
      'functional': 'bg-blue-100 text-blue-800',
      'analytics': 'bg-purple-100 text-purple-800',
      'advertising': 'bg-red-100 text-red-800',
      'social_media': 'bg-pink-100 text-pink-800',
      'personalization': 'bg-orange-100 text-orange-800',
      'unknown': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.unknown;
  };

  const getRiskColor = (level) => {
    const colors = {
      'low': 'text-green-600',
      'medium': 'text-yellow-600',
      'high': 'text-red-600'
    };
    return colors[level] || 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Análisis Completado - Sistema V2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.totalCookies}</div>
              <div className="text-sm text-gray-600">Cookies Detectadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{summary.uniqueVendors}</div>
              <div className="text-sm text-gray-600">Proveedores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.categoriesDetected}</div>
              <div className="text-sm text-gray-600">Categorías</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getRiskColor(summary.overallRisk)}`}>
                {summary.overallRisk?.toUpperCase()}
              </div>
              <div className="text-sm text-gray-600">Nivel de Riesgo</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cookies" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cookies">Cookies</TabsTrigger>
          <TabsTrigger value="compliance">Cumplimiento</TabsTrigger>
          <TabsTrigger value="privacy">Privacidad</TabsTrigger>
          <TabsTrigger value="vendors">Proveedores</TabsTrigger>
          <TabsTrigger value="detection">Detección</TabsTrigger>
        </TabsList>

        {/* Tab de Cookies */}
        <TabsContent value="cookies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cookies Detectadas ({cookies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cookies.length > 0 ? cookies.map((cookie, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium">{cookie.name}</div>
                        <div className="text-sm text-gray-600">{cookie.domain}</div>
                      </div>
                      <Badge className={getCategoryColor(cookie.category)}>
                        {cookie.category?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Origen:</span>
                        <span className="ml-1">{cookie.source}</span>
                      </div>
                      <div>
                        <span className="font-medium">Duración:</span>
                        <span className="ml-1">{cookie.duration || 'Sesión'}</span>
                      </div>
                      <div>
                        <span className="font-medium">HttpOnly:</span>
                        <span className="ml-1">{cookie.httpOnly ? 'Sí' : 'No'}</span>
                      </div>
                      <div>
                        <span className="font-medium">Secure:</span>
                        <span className="ml-1">{cookie.secure ? 'Sí' : 'No'}</span>
                      </div>
                    </div>

                    {cookie.purpose && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Propósito:</span>
                        <span className="ml-1">{cookie.purpose}</span>
                      </div>
                    )}

                    {cookie.vendor && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Proveedor:</span>
                        <span className="ml-1">{cookie.vendor}</span>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-center text-gray-500 py-8">
                    No se detectaron cookies en el análisis
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Cumplimiento */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4">
            {Object.entries(compliance || {}).map(([regulation, data]) => (
              <Card key={regulation}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getComplianceIcon(data.status)}
                    {regulation.toUpperCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Estado de Cumplimiento</span>
                      <Badge variant={data.status === 'compliant' ? 'default' : 'destructive'}>
                        {data.status?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Puntuación</span>
                        <span>{data.score}%</span>
                      </div>
                      <Progress value={data.score} className="w-full" />
                    </div>

                    {data.issues && data.issues.length > 0 && (
                      <div>
                        <div className="font-medium mb-2">Problemas Detectados:</div>
                        <ul className="space-y-1">
                          {data.issues.map((issue, index) => (
                            <li key={index} className="text-sm text-red-600 flex items-center gap-2">
                              <XCircle className="h-3 w-3" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {data.recommendations && data.recommendations.length > 0 && (
                      <div>
                        <div className="font-medium mb-2">Recomendaciones:</div>
                        <ul className="space-y-1">
                          {data.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-blue-600 flex items-center gap-2">
                              <Info className="h-3 w-3" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab de Privacidad */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluación de Privacidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Puntuación General de Privacidad</span>
                    <span>{privacy?.overallScore || 0}%</span>
                  </div>
                  <Progress value={privacy?.overallScore || 0} className="w-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium mb-2">Transparencia</div>
                    <Progress value={privacy?.transparency || 0} className="w-full" />
                    <div className="text-sm text-gray-600 mt-1">{privacy?.transparency || 0}%</div>
                  </div>
                  
                  <div>
                    <div className="font-medium mb-2">Control del Usuario</div>
                    <Progress value={privacy?.userControl || 0} className="w-full" />
                    <div className="text-sm text-gray-600 mt-1">{privacy?.userControl || 0}%</div>
                  </div>
                  
                  <div>
                    <div className="font-medium mb-2">Minimización de Datos</div>
                    <Progress value={privacy?.dataMinimization || 0} className="w-full" />
                    <div className="text-sm text-gray-600 mt-1">{privacy?.dataMinimization || 0}%</div>
                  </div>
                  
                  <div>
                    <div className="font-medium mb-2">Retención de Datos</div>
                    <Progress value={privacy?.dataRetention || 0} className="w-full" />
                    <div className="text-sm text-gray-600 mt-1">{privacy?.dataRetention || 0}%</div>
                  </div>
                </div>

                {privacy?.concerns && privacy.concerns.length > 0 && (
                  <div>
                    <div className="font-medium mb-2">Preocupaciones de Privacidad:</div>
                    <ul className="space-y-1">
                      {privacy.concerns.map((concern, index) => (
                        <li key={index} className="text-sm text-yellow-600 flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3" />
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Proveedores */}
        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proveedores Detectados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vendors.map((vendor, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{vendor.name}</div>
                        <div className="text-sm text-gray-600">{vendor.domain}</div>
                      </div>
                      <Badge>{vendor.cookieCount} cookies</Badge>
                    </div>
                    
                    {vendor.purposes && vendor.purposes.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium">Propósitos:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {vendor.purposes.map((purpose, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {purpose}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Detección */}
        <TabsContent value="detection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Detección Utilizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detectionMethods.map((method, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{method.name}</div>
                      <Badge variant={method.active ? 'default' : 'outline'}>
                        {method.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Cookies detectadas: {method.cookiesFound || 0}
                    </div>
                    
                    {method.executionTime && (
                      <div className="text-sm text-gray-600">
                        Tiempo de ejecución: {method.executionTime}ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CookieAnalysisV2Results;