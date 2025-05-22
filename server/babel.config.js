module.exports = {
  // Presets principales
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      },
      modules: 'commonjs'
    }],
    '@babel/preset-typescript'
  ],

  // Plugins necesarios
  plugins: [
    '@babel/plugin-transform-modules-commonjs',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-transform-runtime',
    '@babel/plugin-transform-private-methods',
    '@babel/plugin-transform-private-property-in-object'
  ],

  // Configuración específica para el entorno de pruebas
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          }
        }]
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        ['@babel/plugin-transform-modules-commonjs', {
          allowTopLevelThis: true
        }]
      ]
    },
    development: {
      plugins: [
        'babel-plugin-dynamic-import-node'
      ]
    }
  },

  // Opciones generales
  sourceMaps: 'inline',
  retainLines: true
};