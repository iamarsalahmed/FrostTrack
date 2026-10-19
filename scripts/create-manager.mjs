import { randomUUID } from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { neon } from '@neondatabase/serverless';
import { hashPassword } from '../lib/password.js';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing. Set it in .env.local and use npm run manager:create.');
  process.exit(1);
}
if (!input.isTTY) {
  console.error('Run this command in an interactive terminal, not in CI.');
  process.exit(1);
}

function hiddenInput(prompt) {
  return new Promise((resolve, reject) => {
    output.write(prompt);
    const chars=[];
    const previous=input.isRaw;
    input.setRawMode(true); input.resume();
    const done=(err,value)=>{
      input.off('data', onData);
      input.setRawMode(Boolean(previous)); input.pause(); output.write('\n');
      if(err) reject(err); else resolve(value);
    };
    function onData(chunk) {
      for(const ch of chunk.toString('utf8')){
        if(ch==='\u0003') return done(new Error('Cancelled'));
        if(ch==='\r' || ch==='\n') return done(null,chars.join(''));
        if(ch==='\b' || ch==='\u007f'){ if(chars.length){chars.pop();output.write('\b \b');} continue; }
        if(ch>=' ' && ch!=='\u007f'){chars.push(ch);output.write('*');}
      }
    }
    input.on('data',onData);
  });
}

try {
  const rl = readline.createInterface({input,output});
  const email=(await rl.question('Manager email: ')).trim().toLowerCase();
  rl.close();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) throw new Error('Enter a valid email address.');
  const password=await hiddenInput('New password (12+ characters; hidden): ');
  const confirm=await hiddenInput('Confirm password: ');
  if(password!==confirm) throw new Error('Passwords do not match.');
  const passwordHash=await hashPassword(password);
  const sql=neon(process.env.DATABASE_URL);
  const [row] = await sql`
    INSERT INTO managers (id,email,password_hash,role,active)
    VALUES (${randomUUID()},${email},${passwordHash},'manager',true)
    ON CONFLICT(email) DO UPDATE
      SET password_hash=excluded.password_hash,
          session_version=managers.session_version+1,
          active=true,updated_at=now()
    RETURNING email,role
  `;
  console.log(`Manager ${row.email} created/updated in Neon. Existing sessions (if any) invalidated.`);
} catch(error) {
  console.error('Manager setup failed:',error.message);
  process.exitCode=1;
}
