#!/usr/bin/env node

/**
 * SCRIPT DE VERIFICACIÓN POST-MIGRACIÓN
 * 
 * Verifica que todos los dominios fueron migrados correctamente
 * 
 * Uso:
 *   node scripts/verifyDomainMigration.js [--detailed] [--dev]
 * 
 * Opciones:
 *   --detailed    Mostrar información detallada de cada dominio
 *   --dev         Usar .env.development.local en lugar de .env
 */

const mongoose = require('mongoose');
const path = require('path');

// Configurar archivo .env según el modo
const isDev = process.argv.includes('--dev');
const envFile = isDev ? '.env.development.local' : '.env';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

if (isDev) {
  console.log(`🔧 Usando configuración de desarrollo: ${envFile}`);
}

const Domain = require('../src/models/Domain');

class MigrationVerifier {
  constructor() {
    this.detailed = process.argv.includes('--detailed');
    this.stats = {
      total: 0,
      valid: 0,
      invalid: 0,
      warnings: 0
    };
    this.issues = [];
  }

  async connect() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21';
    console.log(`🔗 Conectando a MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado a MongoDB');
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB');
  }

  /**
   * Verificar estructura de un dominio
   */
  verifyDomainStructure(domain) {
    const issues = [];
    const warnings = [];

    // Verificar campos requeridos
    if (!domain.domain) {
      issues.push('Campo "domain" faltante');
    }

    if (!domain.clientId) {
      issues.push('Campo "clientId" faltante');
    }

    if (!domain.status) {
      issues.push('Campo "status" faltante');
    } else if (!['active', 'inactive', 'pending'].includes(domain.status)) {
      issues.push(`Estado inválido: ${domain.status}`);
    }

    // Verificar estructura de settings
    if (!domain.settings) {
      warnings.push('Campo "settings" faltante');
    } else {
      // Verificar que solo tenga defaultTemplateId
      const allowedSettingsFields = ['defaultTemplateId'];
      const extraFields = Object.keys(domain.settings).filter(
        field => !allowedSettingsFields.includes(field)
      );
      
      if (extraFields.length > 0) {
        issues.push(`Campos obsoletos en settings: ${extraFields.join(', ')}`);
      }
    }

    // Verificar estructura de scanConfig
    if (!domain.scanConfig) {
      issues.push('Campo "scanConfig" faltante');
    } else {
      const config = domain.scanConfig;
      
      // Verificar campos requeridos en scanConfig
      const requiredFields = [
        'autoScanEnabled',
        'scanInterval', 
        'scanType',
        'maxDepth',
        'includeSubdomains'
      ];
      
      for (const field of requiredFields) {
        if (config[field] === undefined) {
          warnings.push(`Campo scanConfig.${field} faltante`);
        }
      }
      
      // Verificar valores válidos
      if (config.scanInterval && !['hourly', 'every-2-hours', 'every-6-hours', 'every-12-hours', 'daily', 'weekly', 'monthly', 'custom'].includes(config.scanInterval)) {
        issues.push(`scanInterval inválido: ${config.scanInterval}`);
      }
      
      if (config.scanType && !['quick', 'full', 'smart'].includes(config.scanType)) {
        issues.push(`scanType inválido: ${config.scanType}`);
      }
      
      if (config.maxDepth && (config.maxDepth < 1 || config.maxDepth > 10)) {
        issues.push(`maxDepth fuera de rango: ${config.maxDepth}`);
      }
      
      if (config.scanStatus && !['idle', 'scanning', 'completed', 'error'].includes(config.scanStatus)) {
        issues.push(`scanStatus inválido: ${config.scanStatus}`);
      }
    }

    // Verificar campos obsoletos a nivel raíz
    const obsoleteRootFields = ['analysisSchedule'];
    const foundObsoleteFields = obsoleteRootFields.filter(field => domain[field] !== undefined);
    
    if (foundObsoleteFields.length > 0) {
      issues.push(`Campos obsoletos en raíz: ${foundObsoleteFields.join(', ')}`);
    }

    return { issues, warnings };
  }

  /**
   * Verificar configuración de escaneo
   */
  verifyScanConfiguration(domain) {
    const issues = [];
    const recommendations = [];

    if (!domain.scanConfig) return { issues, recommendations };

    const config = domain.scanConfig;

    // Verificar coherencia de configuración
    if (config.autoScanEnabled && !config.cronExpression) {
      issues.push('autoScanEnabled activo pero sin cronExpression');
    }

    if (config.includeSubdomains && config.maxDepth < 2) {
      recommendations.push('includeSubdomains activo con maxDepth bajo, considera aumentar profundidad');
    }

    if (config.scanType === 'smart' && !config.smartAnalysisFrequency) {
      recommendations.push('scanType "smart" sin smartAnalysisFrequency configurada');
    }

    // Verificar fechas
    if (config.lastScheduledScan && config.nextScheduledScan) {
      if (config.nextScheduledScan <= config.lastScheduledScan) {
        issues.push('nextScheduledScan debe ser posterior a lastScheduledScan');
      }
    }

    return { issues, recommendations };
  }

  /**
   * Verificar un dominio individual
   */
  async verifyDomain(domain) {
    const domainId = domain._id;
    const domainName = domain.domain;
    
    const result = {
      id: domainId,
      domain: domainName,
      status: 'valid',
      issues: [],
      warnings: [],
      recommendations: []
    };

    try {
      // Verificar estructura básica
      const structureCheck = this.verifyDomainStructure(domain);
      result.issues.push(...structureCheck.issues);
      result.warnings.push(...structureCheck.warnings);

      // Verificar configuración de escaneo
      const scanCheck = this.verifyScanConfiguration(domain);
      result.issues.push(...scanCheck.issues);
      result.recommendations.push(...scanCheck.recommendations);

      // Determinar estado final
      if (result.issues.length > 0) {
        result.status = 'invalid';
        this.stats.invalid++;
      } else {
        result.status = 'valid';
        this.stats.valid++;
      }

      if (result.warnings.length > 0) {
        this.stats.warnings++;
      }

    } catch (error) {
      result.status = 'error';
      result.issues.push(`Error de verificación: ${error.message}`);
      this.stats.invalid++;
    }

    return result;
  }

  /**
   * Mostrar resultado de verificación de un dominio
   */
  displayDomainResult(result) {
    const statusIcon = {
      'valid': '✅',
      'invalid': '❌', 
      'error': '💥'
    };

    console.log(`${statusIcon[result.status]} ${result.domain} (${result.id})`);

    if (result.issues.length > 0) {
      console.log(`   🚨 Problemas: ${result.issues.join(', ')}`);
    }

    if (result.warnings.length > 0) {
      console.log(`   ⚠️ Advertencias: ${result.warnings.join(', ')}`);
    }

    if (result.recommendations.length > 0) {
      console.log(`   💡 Recomendaciones: ${result.recommendations.join(', ')}`);
    }

    if (this.detailed && result.status === 'valid') {
      // Mostrar configuración actual
      const domain = result._domain;
      if (domain?.scanConfig) {
        console.log(`   📋 ScanConfig:`);
        console.log(`      autoScanEnabled: ${domain.scanConfig.autoScanEnabled}`);
        console.log(`      scanInterval: ${domain.scanConfig.scanInterval}`);
        console.log(`      scanType: ${domain.scanConfig.scanType}`);
        console.log(`      maxDepth: ${domain.scanConfig.maxDepth}`);
      }
    }
  }

  /**
   * Ejecutar verificación completa
   */
  async verify() {
    try {
      console.log('🔍 Iniciando verificación post-migración...\n');

      // Obtener todos los dominios
      console.log('📊 Obteniendo dominios...');
      const domains = await Domain.find({}).lean();
      this.stats.total = domains.length;

      console.log(`✅ Encontrados ${domains.length} dominios\n`);

      if (domains.length === 0) {
        console.log('ℹ️ No hay dominios para verificar.');
        return;
      }

      console.log('🔄 Verificando dominios...\n');

      // Verificar cada dominio
      const results = [];
      for (let i = 0; i < domains.length; i++) {
        const domain = domains[i];
        
        console.log(`[${i + 1}/${domains.length}] Verificando: ${domain.domain}`);
        
        const result = await this.verifyDomain(domain);
        result._domain = domain; // Para mostrar detalles si es necesario
        results.push(result);
        
        this.displayDomainResult(result);
        console.log('');
      }

      // Mostrar resumen
      this.showSummary(results);

      return results;

    } catch (error) {
      console.error('💥 Error durante la verificación:', error);
      throw error;
    }
  }

  /**
   * Mostrar resumen de verificación
   */
  showSummary(results) {
    console.log('\n📈 RESUMEN DE VERIFICACIÓN:');
    console.log('============================');
    console.log(`📊 Total verificados: ${this.stats.total}`);
    console.log(`✅ Válidos: ${this.stats.valid}`);
    console.log(`❌ Inválidos: ${this.stats.invalid}`);
    console.log(`⚠️ Con advertencias: ${this.stats.warnings}`);

    // Mostrar problemas frecuentes
    const frequentIssues = {};
    results.forEach(result => {
      result.issues.forEach(issue => {
        frequentIssues[issue] = (frequentIssues[issue] || 0) + 1;
      });
    });

    if (Object.keys(frequentIssues).length > 0) {
      console.log('\n🚨 PROBLEMAS MÁS FRECUENTES:');
      Object.entries(frequentIssues)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([issue, count]) => {
          console.log(`   ${count}x: ${issue}`);
        });
    }

    // Estadísticas de configuración
    const scanConfigs = results
      .filter(r => r._domain?.scanConfig)
      .map(r => r._domain.scanConfig);

    if (scanConfigs.length > 0) {
      console.log('\n📊 ESTADÍSTICAS DE CONFIGURACIÓN:');
      
      const autoScanEnabled = scanConfigs.filter(c => c.autoScanEnabled).length;
      console.log(`   🔄 Escaneo automático habilitado: ${autoScanEnabled}/${scanConfigs.length}`);
      
      const scanTypes = {};
      scanConfigs.forEach(c => {
        scanTypes[c.scanType] = (scanTypes[c.scanType] || 0) + 1;
      });
      console.log(`   🎯 Tipos de escaneo: ${Object.entries(scanTypes).map(([type, count]) => `${type}(${count})`).join(', ')}`);
      
      const intervals = {};
      scanConfigs.forEach(c => {
        intervals[c.scanInterval] = (intervals[c.scanInterval] || 0) + 1;
      });
      console.log(`   ⏰ Intervalos: ${Object.entries(intervals).map(([interval, count]) => `${interval}(${count})`).join(', ')}`);
    }

    // Recomendaciones finales
    if (this.stats.invalid > 0) {
      console.log('\n🔧 ACCIONES RECOMENDADAS:');
      console.log('   1. Revisar dominios inválidos manualmente');
      console.log('   2. Re-ejecutar migración para dominios problemáticos');
      console.log('   3. Verificar integridad de datos en MongoDB');
    } else {
      console.log('\n🎉 ¡Todos los dominios fueron migrados correctamente!');
      console.log('\n📝 Próximos pasos:');
      console.log('   1. Reiniciar servicios de escaneo automático');
      console.log('   2. Verificar funcionalidad en el frontend');
      console.log('   3. Monitorear logs por posibles errores');
    }
  }
}

// Ejecutar verificación
async function main() {
  const verifier = new MigrationVerifier();
  
  try {
    await verifier.connect();
    await verifier.verify();
    
  } catch (error) {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  } finally {
    await verifier.disconnect();
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = MigrationVerifier;