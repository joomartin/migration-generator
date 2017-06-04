const cluster = require('cluster');

const jobs = [
    [1, 2, 3],
    [4] 
];

const processCount = 2;

if (cluster.isMaster) {
    for (let i = 0; i < processCount; i++) {
        cluster.fork({ jobs: jobs[i] });
    }
} else {
    console.log(jobs);
    console.log(process.env.jobs == jobs[0]);
}
