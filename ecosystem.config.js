module.exports = {
  apps: [{
    name: 'send-expiring-wa',
    script: 'scripts/send-expiring-wa.js',
    cwd: 'C:/Users/LENOVO/Documents/medplayapp/medplay-web',
    env: {
      NODE_ENV: 'production',
      // Si quieres, aquí puedes fijar el cron o la zona horaria
      // CRON_SCHEDULE: '45 21 * * *',
      // TZ: 'America/Bogota'
    }
  }]
}
