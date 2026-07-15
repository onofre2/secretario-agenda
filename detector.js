process.on('exit', (code) => console.error('SAIU COM CODIGO:', code));
process.on('uncaughtException', (err) => console.error('ERRO NAO CAPTURADO:', err));
process.on('unhandledRejection', (err) => console.error('PROMISE REJEITADA:', err));
require('./node_modules/expo/bin/cli');
