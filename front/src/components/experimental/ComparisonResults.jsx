import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { ArrowRight, TrendingUp, TrendingDown, Equal } from 'lucide-react';

const ComparisonResults = ({ comparisonResult, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Comparando sistemas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error en comparación: {error.message || 'Error desconocido'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!comparisonResult || !comparisonResult.data) {
    return null;
  }

  const { v1Results, v2Results, comparison, improvements } = comparisonResult.data;

  const getTrendIcon = (difference) => {
    if (difference > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (difference < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Equal className="h-4 w-4 text-gray-500" />;
  };

  const getPercentageChange = (oldValue, newValue) => {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Resumen de Comparación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-600" />
            Comparación de Sistemas V1 vs V2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cookies Detectadas */}
            <div className="text-center border rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-lg font-semibold">Cookies Detectadas</span>
                {getTrendIcon(v2Results.summary.totalCookies - v1Results.summary.totalCookies)}
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{v1Results.summary.totalCookies}</div>
                  <div className="text-sm text-gray-500">V1</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{v2Results.summary.totalCookies}</div>
                  <div className="text-sm text-gray-500">V2</div>
                </div>
              </div>
              <div className="mt-2">
                <Badge variant={v2Results.summary.totalCookies > v1Results.summary.totalCookies ? 'default' : 'secondary'}>
                  {getPercentageChange(v1Results.summary.totalCookies, v2Results.summary.totalCookies) > 0 ? '+' : ''}
                  {getPercentageChange(v1Results.summary.totalCookies, v2Results.summary.totalCookies)}%
                </Badge>
              </div>
            </div>

            {/* Proveedores */}
            <div className="text-center border rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-lg font-semibold">Proveedores</span>
                {getTrendIcon(v2Results.summary.uniqueVendors - v1Results.summary.uniqueVendors)}
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{v1Results.summary.uniqueVendors}</div>
                  <div className="text-sm text-gray-500">V1</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{v2Results.summary.uniqueVendors}</div>
                  <div className="text-sm text-gray-500">V2</div>
                </div>
              </div>
              <div className="mt-2">
                <Badge variant={v2Results.summary.uniqueVendors > v1Results.summary.uniqueVendors ? 'default' : 'secondary'}>
                  {getPercentageChange(v1Results.summary.uniqueVendors, v2Results.summary.uniqueVendors) > 0 ? '+' : ''}
                  {getPercentageChange(v1Results.summary.uniqueVendors, v2Results.summary.uniqueVendors)}%
                </Badge>
              </div>
            </div>

            {/* Tiempo de Análisis */}
            <div className="text-center border rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-lg font-semibold">Tiempo (segundos)</span>
                {getTrendIcon(v1Results.executionTime - v2Results.executionTime)} {/* Menor tiempo es mejor */}
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{Math.round(v1Results.executionTime / 1000)}</div>
                  <div className="text-sm text-gray-500">V1</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{Math.round(v2Results.executionTime / 1000)}</div>
                  <div className="text-sm text-gray-500">V2</div>
                </div>
              </div>
              <div className="mt-2">
                <Badge variant={v2Results.executionTime < v1Results.executionTime ? 'default' : 'secondary'}>
                  {v2Results.executionTime < v1Results.executionTime ? 'Más rápido' : 'Más lento'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mejoras Detectadas */}
      {improvements && improvements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mejoras del Sistema V2</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {improvements.map((improvement, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-800">{improvement.title}</div>
                    <div className="text-sm text-green-700">{improvement.description}</div>
                    {improvement.impact && (
                      <div className="text-xs text-green-600 mt-1">
                        Impacto: {improvement.impact}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalle de Categorías */}
      <Card>
        <CardHeader>
          <CardTitle>Comparación por Categorías</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comparison.categories && Object.entries(comparison.categories).map(([category, data]) => (
              <div key={category} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium capitalize">
                    {category.replace('_', ' ')}
                  </h4>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(data.v2Count - data.v1Count)}
                    <Badge>
                      {data.v1Count} → {data.v2Count}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Sistema V1</div>
                    <Progress value={(data.v1Count / v1Results.summary.totalCookies) * 100} className="h-2" />
                    <div className="text-xs text-gray-500 mt-1">
                      {data.v1Count} cookies ({Math.round((data.v1Count / v1Results.summary.totalCookies) * 100)}%)
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Sistema V2</div>
                    <Progress value={(data.v2Count / v2Results.summary.totalCookies) * 100} className="h-2" />
                    <div className="text-xs text-gray-500 mt-1">
                      {data.v2Count} cookies ({Math.round((data.v2Count / v2Results.summary.totalCookies) * 100)}%)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cookies Únicas Detectadas por V2 */}
      {comparison.uniqueToV2 && comparison.uniqueToV2.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cookies Detectadas Solo por V2 ({comparison.uniqueToV2.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comparison.uniqueToV2.map((cookie, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <div>
                    <div className="font-medium text-sm">{cookie.name}</div>
                    <div className="text-xs text-gray-600">{cookie.domain}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {cookie.category?.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComparisonResults;