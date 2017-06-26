const Agenda = require('agenda');

const createTablesJob = require('../database/tables/create');

const agenda = new Agenda({ db: { address: 'mongodb://127.0.0.1:27017/agenda' } });

agenda.define('create new tables', (job, done) => {
    createTablesJob.run()
        .then(res => {
            console.log(`${res.result.n} migration(s) was generated for new table`);        
            done()
        });
});

agenda.on('ready', function() {
    agenda.every('5 seconds', 'create new tables', { timezone: 'Europe/Budapest' });
    agenda.start();
});