import {execFileSync} from 'node:child_process';
let output;try{output=execFileSync('npm',['audit','--omit=dev','--json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']})}catch(e){output=e.stdout}
try{const data=JSON.parse(output);console.log('Runtime dependency audit:',JSON.stringify(Object.entries(data.vulnerabilities||{}).map(([name,v])=>({name,severity:v.severity,range:v.range,fixAvailable:v.fixAvailable,via:v.via}))));if((data.metadata?.vulnerabilities?.high||0)+(data.metadata?.vulnerabilities?.critical||0)>0)process.exitCode=1;}catch{console.log('Runtime dependency audit unavailable')}

